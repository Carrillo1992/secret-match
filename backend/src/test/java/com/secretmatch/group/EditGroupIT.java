package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #23: the Admin edits a Group's name, budget and Exchange Date. Every test runs on 2026-12-01 at 10:00
 * UTC.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class EditGroupIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    @DisplayName("the Admin edits the Group, every Member sees the change, and nobody is emailed")
    void adminEditsTheGroup() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen);
        joinGroup(luis, carmen, groupId);
        mail.clear();

        edit(carmen, groupId, details("Reyes en el pueblo", "2027-01-06", "30"))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.name")
                .isEqualTo("Reyes en el pueblo")
                .jsonPath("$.exchangeDate")
                .isEqualTo("2027-01-06")
                .jsonPath("$.budget")
                .isEqualTo(30.0)
                .jsonPath("$.admin")
                .isEqualTo(true);

        get(luis, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.name")
                .isEqualTo("Reyes en el pueblo")
                .jsonPath("$.exchangeDate")
                .isEqualTo("2027-01-06")
                .jsonPath("$.budget")
                .isEqualTo(30.0)
                .jsonPath("$.members[*].displayName")
                .isEqualTo(List.of("Abuela Carmen", "Luis"));
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("leaving the budget out takes it away")
    void budgetLeftOutIsRemoved() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen);

        edit(carmen, groupId, details("Navidad", "2026-12-24", null))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.budget")
                .doesNotExist();
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.budget")
                .doesNotExist();
    }

    @Test
    @DisplayName("a past Exchange Date, or today's, is refused and nothing changes")
    void pastExchangeDateIsRefused() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen);

        for (String notInTheFuture : List.of("2026-11-30", "2026-12-01")) {
            edit(carmen, groupId, details("Otro nombre", notInTheFuture, null))
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:exchange-date-not-in-future");
        }
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.name")
                .isEqualTo("Navidad")
                .jsonPath("$.exchangeDate")
                .isEqualTo("2026-12-24")
                .jsonPath("$.budget")
                .isEqualTo(25.0);
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot edit, and a non-Member gets 404")
    void onlyTheAdminEdits() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User stranger = signedInUser("Desconocido");
        String groupId = createGroup(carmen);
        joinGroup(luis, carmen, groupId);

        edit(luis, groupId, details("De Luis", "2026-12-24", null))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");
        edit(stranger, groupId, details("Del desconocido", "2026-12-24", null))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        http.put()
                .uri("/api/v1/groups/" + groupId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(details("Anónimo", "2026-12-24", null))
                .exchange()
                .expectStatus()
                .isUnauthorized();

        get(carmen, "/api/v1/groups/" + groupId).expectBody().jsonPath("$.name").isEqualTo("Navidad");
    }

    @Test
    @DisplayName("a blank name, a missing Exchange Date or a negative budget is a bad request")
    void malformedDetails() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen);

        edit(carmen, groupId, details("  ", "2026-12-24", null)).expectStatus().isBadRequest();
        edit(carmen, groupId, details("Navidad", null, null)).expectStatus().isBadRequest();
        edit(carmen, groupId, details("Navidad", "2026-12-24", "-5"))
                .expectStatus()
                .isBadRequest();
    }

    // ---------- helpers ----------

    private static Map<String, Object> details(String name, String exchangeDate, String budget) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        if (exchangeDate != null) {
            body.put("exchangeDate", exchangeDate);
        }
        if (budget != null) {
            body.put("budget", new java.math.BigDecimal(budget));
        }
        return body;
    }

    private RestTestClient.ResponseSpec edit(User by, String groupId, Map<String, Object> body) {
        return http.put()
                .uri("/api/v1/groups/" + groupId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + by.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private void joinGroup(User user, User admin, String groupId) {
        String inviteCode =
                json(get(admin, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
        post(user, "/api/v1/memberships", Map.of("inviteCode", inviteCode))
                .expectStatus()
                .isOk();
    }

    record User(String accessToken, String email) {}

    /** "Navidad" on Christmas Eve, with a budget of 25 euros. */
    private String createGroup(User admin) {
        RestTestClient.ResponseSpec created =
                post(admin, "/api/v1/groups", Map.of("name", "Navidad", "exchangeDate", "2026-12-24", "budget", 25));
        created.expectStatus().isCreated();
        return json(created).get("id").asString();
    }

    private RestTestClient.ResponseSpec get(User user, String path) {
        return http.get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .exchange();
    }

    private RestTestClient.ResponseSpec post(User user, String path, Map<String, ?> body) {
        return http.post()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    /** Signs up, verifies and signs in a new User. */
    private User signedInUser(String displayName) {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        anonymousPost("/api/v1/sign-ups", Map.of("email", email, "displayName", displayName, "password", PASSWORD))
                .expectStatus()
                .isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(email).getLast().text());
        assertThat(matcher.find()).isTrue();
        anonymousPost("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
        RestTestClient.ResponseSpec signIn =
                anonymousPost("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
        signIn.expectStatus().isOk();
        return new User(json(signIn).get("accessToken").asString(), email);
    }

    private RestTestClient.ResponseSpec anonymousPost(String path, Map<String, ?> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        return JSON.readTree(response.expectBody(String.class).returnResult().getResponseBody());
    }
}
