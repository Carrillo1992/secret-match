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
 * Ticket #25: a Group is read-only from 00:00 in Madrid on the day after its Exchange Date. Every Group here
 * exchanges on Christmas Eve 2026, so it is finished from 2026-12-24T23:00:00Z (Madrid is UTC+1 in winter).
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class FinishedGroupIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** 23:59:59 on Christmas Eve in Madrid. */
    private static final Instant LAST_OPEN_MOMENT = Instant.parse("2026-12-24T22:59:59Z");

    /** 00:00 on Christmas Day in Madrid. */
    private static final Instant FINISHED = Instant.parse("2026-12-24T23:00:00Z");

    private static final String GROUP_FINISHED = "urn:secretmatch:problem:group-finished";

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    /** The current access token of every User signed in by the test, by email. */
    private final Map<String, String> accessTokens = new HashMap<>();

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    @DisplayName("the Group page and \"Mis grupos\" say whether the Group is finished")
    void membersSeeTheGroupIsFinished() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen);

        moveClockTo(LAST_OPEN_MOMENT);
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.finished")
                .isEqualTo(false);
        get(carmen, "/api/v1/groups").expectBody().jsonPath("$[0].finished").isEqualTo(false);

        moveClockTo(FINISHED);
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.finished")
                .isEqualTo(true);
        get(carmen, "/api/v1/groups").expectBody().jsonPath("$[0].finished").isEqualTo(true);
    }

    @Test
    @DisplayName("on the last minute of the Exchange Date everything still works")
    void openUntilTheEndOfTheExchangeDate() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen);
        joinGroup(luis, carmen, groupId);

        moveClockTo(LAST_OPEN_MOMENT);
        joinGroup(marta, carmen, groupId);
        edit(carmen, groupId, "Nochebuena").expectStatus().isOk();
        post(carmen, "/api/v1/groups/" + groupId + "/invite-link", Map.of())
                .expectStatus()
                .isOk();
        delete(luis, groupId + "/members/" + memberIdOf(luis, groupId, "Luis"))
                .expectStatus()
                .isNoContent();
        delete(carmen, groupId + "/members/" + memberIdOf(carmen, groupId, "Marta"))
                .expectStatus()
                .isNoContent();
    }

    @Test
    @DisplayName("on a finished Group joining, regenerating the Invite Link, leaving, removing and editing are refused")
    void finishedGroupIsReadOnly() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        User latecomer = signedInUser("Rezagado");
        String groupId = createGroup(carmen);
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String inviteCode = inviteCodeOf(carmen, groupId);
        String luisId = memberIdOf(carmen, groupId, "Luis");
        String martaId = memberIdOf(carmen, groupId, "Marta");
        mail.clear();

        moveClockTo(FINISHED);
        List.of(
                        post(latecomer, "/api/v1/memberships", Map.of("inviteCode", inviteCode)),
                        post(carmen, "/api/v1/groups/" + groupId + "/invite-link", Map.of()),
                        delete(luis, groupId + "/members/" + luisId),
                        delete(carmen, groupId + "/members/" + martaId),
                        edit(carmen, groupId, "Otro nombre"))
                .forEach(refused -> refused.expectStatus()
                        .isEqualTo(422)
                        .expectBody()
                        .jsonPath("$.type")
                        .isEqualTo(GROUP_FINISHED));

        JsonNode group = json(get(carmen, "/api/v1/groups/" + groupId));
        assertThat(group.get("name").asString()).isEqualTo("Navidad");
        assertThat(group.get("inviteCode").asString()).isEqualTo(inviteCode);
        assertThat(group.get("members").findValuesAsString("displayName"))
                .containsExactlyInAnyOrder("Abuela Carmen", "Luis", "Marta");
        get(latecomer, "/api/v1/groups/" + groupId).expectStatus().isNotFound();
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("a Member already in a finished Group who opens its Invite Link again just gets the Group back")
    void memberReopensTheInviteLink() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen);
        joinGroup(luis, carmen, groupId);

        moveClockTo(FINISHED);
        post(luis, "/api/v1/memberships", Map.of("inviteCode", inviteCodeOf(carmen, groupId)))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.groupId")
                .isEqualTo(groupId);
    }

    @Test
    @DisplayName("the Admin can still delete a finished Group")
    void finishedGroupCanBeDeleted() {
        User carmen = signedInUser("Abuela Carmen");
        String groupId = createGroup(carmen);

        moveClockTo(FINISHED);
        delete(carmen, groupId).expectStatus().isNoContent();
        get(carmen, "/api/v1/groups/" + groupId).expectStatus().isNotFound();
    }

    // ---------- helpers ----------

    /** Moves time on, and signs every User in again: their access tokens from before have expired. */
    private void moveClockTo(Instant moment) {
        clock.set(moment);
        accessTokens.replaceAll((email, expired) -> signIn(email));
    }

    private RestTestClient.ResponseSpec edit(User by, String groupId, String name) {
        return http.put()
                .uri("/api/v1/groups/" + groupId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessTokens.get(by.email()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name, "exchangeDate", "2026-12-24"))
                .exchange();
    }

    private RestTestClient.ResponseSpec delete(User by, String groupPath) {
        return http.delete()
                .uri("/api/v1/groups/" + groupPath)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessTokens.get(by.email()))
                .exchange();
    }

    private String memberIdOf(User viewer, String groupId, String displayName) {
        for (JsonNode member : json(get(viewer, "/api/v1/groups/" + groupId)).get("members")) {
            if (member.get("displayName").asString().equals(displayName)) {
                return member.get("id").asString();
            }
        }
        throw new AssertionError("no Member named " + displayName);
    }

    private void joinGroup(User user, User admin, String groupId) {
        post(user, "/api/v1/memberships", Map.of("inviteCode", inviteCodeOf(admin, groupId)))
                .expectStatus()
                .isOk();
    }

    private String inviteCodeOf(User member, String groupId) {
        return json(get(member, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
    }

    record User(String email) {}

    /** "Navidad" on Christmas Eve 2026. */
    private String createGroup(User admin) {
        RestTestClient.ResponseSpec created =
                post(admin, "/api/v1/groups", Map.of("name", "Navidad", "exchangeDate", "2026-12-24"));
        created.expectStatus().isCreated();
        return json(created).get("id").asString();
    }

    private RestTestClient.ResponseSpec get(User user, String path) {
        return http.get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessTokens.get(user.email()))
                .exchange();
    }

    private RestTestClient.ResponseSpec post(User user, String path, Map<String, ?> body) {
        return http.post()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessTokens.get(user.email()))
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
        accessTokens.put(email, signIn(email));
        return new User(email);
    }

    /** A new access token for this User. */
    private String signIn(String email) {
        RestTestClient.ResponseSpec signIn =
                anonymousPost("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
        signIn.expectStatus().isOk();
        return json(signIn).get("accessToken").asString();
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
