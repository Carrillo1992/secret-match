package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Instant;
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
 * Ticket #21: joining a Group through its Invite Link, and the Admin regenerating it. Every test runs on
 * 2026-12-01 at 10:00 UTC.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class InviteLinksIT {

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
    @DisplayName("every Member sees the Invite Link, and whether they are the Admin")
    void membersSeeTheInviteLink() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen, "Navidad");

        JsonNode group =
                json(get(carmen, "/api/v1/groups/" + groupId).expectStatus().isOk());

        assertThat(group.get("inviteCode").asString()).matches("[A-Za-z0-9_-]{22}");
        assertThat(group.get("admin").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("opening the Invite Link joins the Group as a Member, after the ones already in it")
    void joinThroughTheInviteLink() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");

        join(luis, inviteCodeOf(carmen, groupId))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.groupId")
                .isEqualTo(groupId);

        get(luis, "/api/v1/groups/" + groupId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.members[*].displayName")
                .isEqualTo(java.util.List.of("Abuela Carmen", "Luis"))
                .jsonPath("$.admin")
                .isEqualTo(false);
        get(luis, "/api/v1/groups")
                .expectBody()
                .jsonPath("$[0].id")
                .isEqualTo(groupId)
                .jsonPath("$[0].memberCount")
                .isEqualTo(2);
    }

    @Test
    @DisplayName("the Admin gets exactly one email per new Member, and none when a Member opens the link again")
    void adminIsEmailedOncePerNewMember() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");
        String code = inviteCodeOf(carmen, groupId);
        mail.clear();

        join(luis, code).expectStatus().isOk();
        join(luis, code)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.groupId")
                .isEqualTo(groupId);
        join(carmen, code)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.groupId")
                .isEqualTo(groupId);

        assertThat(mail.sentTo(carmen.email())).singleElement().satisfies(email -> {
            assertThat(email.subject()).isEqualTo("Luis se ha unido a «Navidad»");
            assertThat(email.text()).contains("Luis").contains("/groups/" + groupId);
        });
        assertThat(mail.sentTo(luis.email())).isEmpty();
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.members.length()")
                .isEqualTo(2);
    }

    @Test
    @DisplayName("the Admin regenerates the Invite Link: the new one works and the previous one stops working")
    void adminRegeneratesTheInviteLink() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");
        String previous = inviteCodeOf(carmen, groupId);

        RestTestClient.ResponseSpec regenerated = regenerate(carmen, groupId);

        regenerated.expectStatus().isOk();
        String current = json(regenerated).get("inviteCode").asString();
        assertThat(current).matches("[A-Za-z0-9_-]{22}").isNotEqualTo(previous);
        assertThat(inviteCodeOf(carmen, groupId)).isEqualTo(current);
        expectInvalidLink(join(luis, previous));
        join(luis, current).expectStatus().isOk();
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot regenerate the Invite Link, and a non-Member gets 404")
    void onlyTheAdminRegenerates() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User stranger = signedInUser("Desconocido");
        String groupId = createGroup(carmen, "Navidad");
        String code = inviteCodeOf(carmen, groupId);
        join(luis, code).expectStatus().isOk();

        regenerate(luis, groupId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");
        regenerate(stranger, groupId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        assertThat(inviteCodeOf(carmen, groupId)).isEqualTo(code);
    }

    @Test
    @DisplayName("an unknown, malformed or regenerated code is refused the same way, revealing nothing about the Group")
    void invalidLinksRevealNothing() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad en casa de la abuela");
        String previous = inviteCodeOf(carmen, groupId);
        regenerate(carmen, groupId).expectStatus().isOk();

        String forRegenerated = body(expectInvalidLink(join(luis, previous)));
        String forUnknown = body(expectInvalidLink(join(luis, "AAAAAAAAAAAAAAAAAAAAAA")));
        String forMalformed = body(expectInvalidLink(join(luis, "not a code!")));

        assertThat(forRegenerated)
                .isEqualTo(forUnknown)
                .isEqualTo(forMalformed)
                .doesNotContain(groupId)
                .doesNotContain("Navidad")
                .doesNotContain("Carmen");
        get(luis, "/api/v1/groups").expectBody().json("[]");
    }

    @Test
    @DisplayName("joining and regenerating need a signed-in User")
    void inviteLinksNeedASignedInUser() {
        anonymousPost("/api/v1/memberships", Map.of("inviteCode", "AAAAAAAAAAAAAAAAAAAAAA"))
                .expectStatus()
                .isUnauthorized();
        anonymousPost("/api/v1/groups/" + UUID.randomUUID() + "/invite-link", Map.of())
                .expectStatus()
                .isUnauthorized();
    }

    // ---------- helpers ----------

    private RestTestClient.ResponseSpec regenerate(User user, String groupId) {
        return http.post()
                .uri("/api/v1/groups/" + groupId + "/invite-link")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .exchange();
    }

    private static RestTestClient.ResponseSpec expectInvalidLink(RestTestClient.ResponseSpec response) {
        response.expectStatus()
                .isNotFound()
                .expectHeader()
                .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:invite-link-invalid");
        return response;
    }

    private static String body(RestTestClient.ResponseSpec response) {
        String body = response.expectBody(String.class).returnResult().getResponseBody();
        return body == null ? "" : body.replaceAll("\"instance\":\"[^\"]*\"", "");
    }

    private RestTestClient.ResponseSpec join(User user, String inviteCode) {
        return post(user, "/api/v1/memberships", Map.of("inviteCode", inviteCode));
    }

    private String inviteCodeOf(User member, String groupId) {
        return json(get(member, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
    }

    record User(String accessToken, String email) {}

    private String createGroup(User admin, String name) {
        RestTestClient.ResponseSpec created = http.post()
                .uri("/api/v1/groups")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name, "exchangeDate", "2026-12-24"))
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
