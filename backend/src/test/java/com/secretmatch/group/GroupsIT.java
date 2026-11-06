package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #20: create a Group, list my Groups, see a Group; a non-Member gets 404. The clock starts on
 * 2026-12-01 at 10:00 UTC (11:00 in Madrid).
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class GroupsIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Test
    @DisplayName("the creator of a Group is its Admin and a Member, and sees its details")
    void creatorIsAdminAndMember() {
        String carmen = signedInUser("Abuela Carmen");

        RestTestClient.ResponseSpec created =
                createGroup(carmen, group("Navidad en casa de la abuela", "2026-12-24", "25.50"));

        created.expectStatus().isCreated();
        JsonNode body = json(created);
        String groupId = body.get("id").asString();
        created.expectHeader().valueEquals(HttpHeaders.LOCATION, "/api/v1/groups/" + groupId);

        get(carmen, "/api/v1/groups/" + groupId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(groupId)
                .jsonPath("$.name")
                .isEqualTo("Navidad en casa de la abuela")
                .jsonPath("$.exchangeDate")
                .isEqualTo("2026-12-24")
                .jsonPath("$.budget")
                .isEqualTo(25.5)
                .jsonPath("$.members.length()")
                .isEqualTo(1)
                .jsonPath("$.members[0].displayName")
                .isEqualTo("Abuela Carmen")
                .jsonPath("$.members[0].admin")
                .isEqualTo(true);
    }

    @Test
    @DisplayName("my Groups lists only the Groups I am a Member of, soonest Exchange Date first")
    void myGroupsListsOnlyMine() {
        String carmen = signedInUser("Abuela Carmen");
        String luis = signedInUser("Luis");
        String newcomer = signedInUser("Nadie");
        createGroup(carmen, group("Reyes", "2027-01-06", null)).expectStatus().isCreated();
        createGroup(carmen, group("Navidad", "2026-12-24", "30")).expectStatus().isCreated();
        createGroup(luis, group("Amigos invisibles", "2026-12-20", null))
                .expectStatus()
                .isCreated();

        RestTestClient.ResponseSpec mine = get(carmen, "/api/v1/groups");
        mine.expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(2)
                .jsonPath("$[0].name")
                .isEqualTo("Navidad")
                .jsonPath("$[0].exchangeDate")
                .isEqualTo("2026-12-24")
                .jsonPath("$[0].budget")
                .isEqualTo(30)
                .jsonPath("$[0].memberCount")
                .isEqualTo(1)
                .jsonPath("$[0].admin")
                .isEqualTo(true)
                .jsonPath("$[1].name")
                .isEqualTo("Reyes");
        assertThat(json(mine).get(1).has("budget"))
                .as("a Group without a budget has none")
                .isFalse();
        get(luis, "/api/v1/groups")
                .expectBody()
                .jsonPath("$[*].name")
                .isEqualTo(java.util.List.of("Amigos invisibles"));
        get(newcomer, "/api/v1/groups").expectStatus().isOk().expectBody().json("[]");
    }

    @Test
    @DisplayName("a non-Member gets the same 404 for a Group as for one that does not exist")
    void nonMemberGetsNotFound() {
        String carmen = signedInUser("Abuela Carmen");
        String stranger = signedInUser("Desconocido");
        String groupId = json(createGroup(carmen, group("Navidad", "2026-12-24", null)))
                .get("id")
                .asString();

        String forStranger = body(expectNotFound(get(stranger, "/api/v1/groups/" + groupId)));
        String forNobody = body(expectNotFound(get(carmen, "/api/v1/groups/" + UUID.randomUUID())));

        assertThat(forStranger).isEqualTo(forNobody).doesNotContain(groupId).doesNotContain("Navidad");
    }

    @Test
    @DisplayName("a missing name or Exchange Date, or a negative budget, is refused as a bad request")
    void malformedGroupIsRefused() {
        String carmen = signedInUser("Abuela Carmen");

        createGroup(carmen, group("  ", "2026-12-24", null)).expectStatus().isBadRequest();
        createGroup(carmen, group("Navidad", null, null)).expectStatus().isBadRequest();
        createGroup(carmen, group("Navidad", "2026-12-24", "-5")).expectStatus().isBadRequest();
        createGroup(carmen, group("Navidad", "2026-12-24", "10.999"))
                .expectStatus()
                .isBadRequest();
        get(carmen, "/api/v1/groups").expectBody().json("[]");
    }

    @Test
    @DisplayName("an Exchange Date that is not after today in Madrid is refused")
    void pastExchangeDateIsRefused() {
        String carmen = signedInUser("Abuela Carmen");

        for (String notInTheFuture : new String[] {"2026-11-30", "2026-12-01"}) {
            createGroup(carmen, group("Navidad", notInTheFuture, null))
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:exchange-date-not-in-future");
        }
        createGroup(carmen, group("Navidad", "2026-12-02", null)).expectStatus().isCreated();
    }

    @Test
    @DisplayName("every Group endpoint needs a signed-in User")
    void groupsNeedASignedInUser() {
        http.get().uri("/api/v1/groups").exchange().expectStatus().isUnauthorized();
        http.get()
                .uri("/api/v1/groups/" + UUID.randomUUID())
                .exchange()
                .expectStatus()
                .isUnauthorized();
        http.post()
                .uri("/api/v1/groups")
                .contentType(MediaType.APPLICATION_JSON)
                .body(group("Navidad", "2026-12-24", null))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    // ---------- helpers ----------

    private static RestTestClient.ResponseSpec expectNotFound(RestTestClient.ResponseSpec response) {
        response.expectStatus()
                .isNotFound()
                .expectHeader()
                .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        return response;
    }

    private static String body(RestTestClient.ResponseSpec response) {
        String body = response.expectBody(String.class).returnResult().getResponseBody();
        return body == null ? "" : body.replaceAll("\"instance\":\"[^\"]*\"", "");
    }

    private static Map<String, Object> group(String name, String exchangeDate, String budget) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("exchangeDate", exchangeDate);
        if (budget != null) {
            body.put("budget", new java.math.BigDecimal(budget));
        }
        return body;
    }

    private RestTestClient.ResponseSpec createGroup(String accessToken, Map<String, Object> body) {
        return http.post()
                .uri("/api/v1/groups")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec get(String accessToken, String path) {
        return http.get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    /** Signs up, verifies and signs in a new User; returns their access token. */
    private String signedInUser(String displayName) {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        post("/api/v1/sign-ups", Map.of("email", email, "displayName", displayName, "password", PASSWORD))
                .expectStatus()
                .isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(email).getLast().text());
        assertThat(matcher.find()).isTrue();
        post("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
        RestTestClient.ResponseSpec signIn = post("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
        signIn.expectStatus().isOk();
        return json(signIn).get("accessToken").asString();
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        EntityExchangeResult<String> result = response.expectBody(String.class).returnResult();
        return JSON.readTree(result.getResponseBody());
    }
}
