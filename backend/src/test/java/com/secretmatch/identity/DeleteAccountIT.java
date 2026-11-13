package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Instant;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #19: a signed-in User deletes their account. Every test starts on 2026-12-01 at 10:00 UTC. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class DeleteAccountIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final Pattern REFRESH_COOKIE = Pattern.compile("refresh_token=([^;]*)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    @DisplayName("a Member deletes their account: they leave their Groups, cannot sign in, and their Sessions end")
    void memberDeletesTheirAccount() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad", "2026-12-24");
        joinGroup(luis, carmen, groupId);

        deleteAccount(luis).expectStatus().isNoContent();

        JsonNode group =
                json(get(carmen, "/api/v1/groups/" + groupId).expectStatus().isOk());
        assertThat(group.get("members").size()).isEqualTo(1);
        signIn(luis.email())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:invalid-credentials");
        refresh(luis)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:session-expired");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email = ?", Long.class, luis.email()))
                .isZero();
    }

    @Test
    @DisplayName("deleting an Admin deletes their Groups and emails each of its other Members")
    void adminsGroupsGoWithThem() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad", "2026-12-24");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String othersGroup = createGroup(luis, "Amigo invisible", "2026-12-20");
        joinGroup(carmen, luis, othersGroup);
        mail.clear();

        deleteAccount(carmen).expectStatus().isNoContent();

        get(luis, "/api/v1/groups/" + groupId).expectStatus().isNotFound();
        get(marta, "/api/v1/groups").expectBody().json("[]");
        JsonNode stillThere =
                json(get(luis, "/api/v1/groups/" + othersGroup).expectStatus().isOk());
        assertThat(stillThere.get("members").size()).isEqualTo(1);
        assertThat(mail.sent()).extracting(OutgoingEmail::to).containsExactlyInAnyOrder(luis.email(), marta.email());
        assertThat(mail.sent())
                .allSatisfy(email -> assertThat(email.subject()).isEqualTo("Se ha borrado el grupo «Navidad»"));
    }

    @Test
    @DisplayName("refused while in a Group with a Draw before its Exchange Date has passed; nothing changes")
    void refusedWhileInAnUnfinishedDrawnGroup() {
        Family family = drawnFamily();
        mail.clear();

        for (User member : List.of(family.luis(), family.carmen())) {
            deleteAccount(member)
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:account-in-draw")
                    .jsonPath("$.detail")
                    .value(
                            String.class,
                            detail -> assertThat(detail)
                                    .contains("cancel the Draw")
                                    .contains("Exchange Date"));
        }

        JsonNode group = json(get(family.carmen(), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isOk());
        assertThat(group.get("members").size()).isEqualTo(4);
        get(family.luis(), "/api/v1/groups/" + family.groupId() + "/draw")
                .expectStatus()
                .isOk();
        signIn(family.luis().email()).expectStatus().isOk();
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("once the Group is finished, a Member of its Draw can delete their account and leaves it")
    void allowedOnceTheDrawnGroupIsFinished() {
        Family family = drawnFamily();
        clock.set(Instant.parse("2026-12-24T23:00:00Z")); // 00:00 on the 25th in Madrid
        User luis = signedInAgain(family.luis());
        User carmen = signedInAgain(family.carmen());

        deleteAccount(luis).expectStatus().isNoContent();

        JsonNode group = json(
                get(carmen, "/api/v1/groups/" + family.groupId()).expectStatus().isOk());
        assertThat(group.get("members").size()).isEqualTo(3);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM assignments WHERE giver_id = ?::uuid OR receiver_id = ?::uuid",
                        Long.class,
                        family.luisId(),
                        family.luisId()))
                .isZero();
    }

    @Test
    @DisplayName("an Admin of a finished drawn Group can delete their account, and the Group goes with them")
    void adminOfAFinishedDrawnGroup() {
        Family family = drawnFamily();
        clock.set(Instant.parse("2026-12-24T23:00:00Z"));

        deleteAccount(signedInAgain(family.carmen())).expectStatus().isNoContent();

        get(signedInAgain(family.luis()), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isNotFound();
    }

    @Test
    @DisplayName("without a valid access token the account is not deleted")
    void needsToBeSignedIn() {
        http.delete().uri("/api/v1/users/me").exchange().expectStatus().isUnauthorized();
    }

    // ---------- helpers ----------

    record User(String accessToken, String refreshToken, String email) {}

    record Family(User carmen, User luis, String groupId, String luisId) {}

    /** Carmen's Group of four, drawn, with its Exchange Date on 2026-12-24. */
    private Family drawnFamily() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad", "2026-12-24");
        joinGroup(luis, carmen, groupId);
        joinGroup(signedInUser("Marta"), carmen, groupId);
        joinGroup(signedInUser("Pedro"), carmen, groupId);
        http.post()
                .uri("/api/v1/groups/" + groupId + "/draw")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + carmen.accessToken())
                .exchange()
                .expectStatus()
                .isCreated();
        String luisId = null;
        for (JsonNode member : json(get(luis, "/api/v1/groups/" + groupId)).get("members")) {
            if (member.get("you").asBoolean()) {
                luisId = member.get("id").asString();
            }
        }
        return new Family(carmen, luis, groupId, luisId);
    }

    private RestTestClient.ResponseSpec deleteAccount(User user) {
        return http.delete()
                .uri("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .exchange();
    }

    private RestTestClient.ResponseSpec refresh(User user) {
        return http.post()
                .uri("/api/v1/sessions/refresh")
                .cookie("refresh_token", user.refreshToken())
                .exchange();
    }

    private RestTestClient.ResponseSpec signIn(String email) {
        return anonymousPost("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
    }

    private void joinGroup(User user, User admin, String groupId) {
        String inviteCode =
                json(get(admin, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
        http.post()
                .uri("/api/v1/memberships")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("inviteCode", inviteCode))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createGroup(User admin, String name, String exchangeDate) {
        RestTestClient.ResponseSpec created = http.post()
                .uri("/api/v1/groups")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name, "exchangeDate", exchangeDate))
                .exchange();
        created.expectStatus().isCreated();
        return json(created).get("id").asString();
    }

    private RestTestClient.ResponseSpec get(User user, String path) {
        return http.get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .exchange();
    }

    /** A new Session for the User, whose access token is fresh at the clock's current time. */
    private User signedInAgain(User user) {
        return session(user.email());
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
        return session(email);
    }

    private User session(String email) {
        EntityExchangeResult<String> signedIn =
                signIn(email).expectStatus().isOk().expectBody(String.class).returnResult();
        Matcher cookie = REFRESH_COOKIE.matcher(signedIn.getResponseHeaders().getFirst(HttpHeaders.SET_COOKIE));
        assertThat(cookie.find()).isTrue();
        return new User(
                JSON.readTree(signedIn.getResponseBody()).get("accessToken").asString(), cookie.group(1), email);
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
