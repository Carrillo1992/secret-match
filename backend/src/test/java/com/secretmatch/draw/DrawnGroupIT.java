package com.secretmatch.draw;

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
 * Ticket #29: once the Draw is made, the Group's membership and Exclusions are frozen (ADR 0001). Every action that
 * would change them is refused one by one. Every test runs on 2026-12-01 at 10:00 UTC.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class DrawnGroupIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String GROUP_DRAWN = "urn:secretmatch:problem:group-drawn";

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
    @DisplayName("the Group says whether its Draw is made")
    void groupSaysWhetherItIsDrawn() {
        Family family = family();
        get(family.luis(), groupOf(family)).expectBody().jsonPath("$.drawn").isEqualTo(false);

        runDraw(family.carmen(), family).expectStatus().isCreated();

        get(family.luis(), groupOf(family)).expectBody().jsonPath("$.drawn").isEqualTo(true);
    }

    @Test
    @DisplayName("nobody joins a drawn Group: its Invite Link answers without saying anything about the Group")
    void inviteLinkStopsWorking() {
        Family family = family();
        String inviteCode =
                json(get(family.carmen(), groupOf(family))).get("inviteCode").asString();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        User newcomer = signedInUser("Rosa");
        int emailsToCarmen = mail.sentTo(family.carmen().email()).size();

        RestTestClient.ResponseSpec joined = post(newcomer, "/api/v1/memberships", Map.of("inviteCode", inviteCode));

        joined.expectStatus().isEqualTo(422);
        String body = joined.expectBody(String.class).returnResult().getResponseBody();
        assertThat(json(body).get("type").asString()).isEqualTo(GROUP_DRAWN);
        assertThat(body)
                .doesNotContain(family.groupId())
                .doesNotContain("Navidad")
                .doesNotContain("Carmen");
        get(newcomer, groupOf(family)).expectStatus().isNotFound();
        assertThat(json(get(family.carmen(), groupOf(family))).get("members")).hasSize(4);
        assertThat(mail.sentTo(family.carmen().email())).hasSize(emailsToCarmen);
    }

    @Test
    @DisplayName("a Member who opens the Invite Link again still just gets the drawn Group back")
    void memberReopensTheInviteLink() {
        Family family = family();
        String inviteCode =
                json(get(family.carmen(), groupOf(family))).get("inviteCode").asString();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        post(family.luis(), "/api/v1/memberships", Map.of("inviteCode", inviteCode))
                .expectBody()
                .jsonPath("$.groupId")
                .isEqualTo(family.groupId());
    }

    @Test
    @DisplayName("nobody leaves a drawn Group")
    void memberCannotLeave() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        delete(family.luis(), groupOf(family) + "/members/" + family.luisId())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(GROUP_DRAWN);

        assertThat(json(get(family.luis(), groupOf(family))).get("members")).hasSize(4);
        get(family.luis(), drawOf(family)).expectStatus().isOk();
    }

    @Test
    @DisplayName("the Admin cannot remove anyone from a drawn Group, and nobody is emailed")
    void adminCannotRemoveAMember() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        int emailsToMarta = mail.sentTo(family.marta().email()).size();

        delete(family.carmen(), groupOf(family) + "/members/" + family.martaId())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(GROUP_DRAWN);

        assertThat(json(get(family.marta(), groupOf(family))).get("members")).hasSize(4);
        assertThat(mail.sentTo(family.marta().email())).hasSize(emailsToMarta);
    }

    @Test
    @DisplayName("the Admin cannot regenerate a drawn Group's Invite Link")
    void adminCannotRegenerateTheInviteLink() {
        Family family = family();
        String inviteCode =
                json(get(family.carmen(), groupOf(family))).get("inviteCode").asString();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        post(family.carmen(), groupOf(family) + "/invite-link", Map.of())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(GROUP_DRAWN);

        get(family.carmen(), groupOf(family))
                .expectBody()
                .jsonPath("$.inviteCode")
                .isEqualTo(inviteCode);
    }

    @Test
    @DisplayName("the Admin cannot create an Exclusion in a drawn Group")
    void adminCannotCreateAnExclusion() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        post(family.carmen(), exclusionsOf(family), Map.of("memberIds", List.of(family.luisId(), family.martaId())))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(GROUP_DRAWN);

        get(family.carmen(), exclusionsOf(family)).expectBody().json("[]");
    }

    @Test
    @DisplayName("the Admin cannot delete an Exclusion of a drawn Group, though still sees it")
    void adminCannotDeleteAnExclusion() {
        Family family = family();
        String exclusionId = json(post(
                        family.carmen(),
                        exclusionsOf(family),
                        Map.of("memberIds", List.of(family.luisId(), family.martaId()))))
                .get("id")
                .asString();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        delete(family.carmen(), exclusionsOf(family) + "/" + exclusionId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(GROUP_DRAWN);

        get(family.carmen(), exclusionsOf(family))
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("the Admin can still edit a drawn Group's details")
    void adminStillEditsTheDetails() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();

        http.put()
                .uri(groupOf(family))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + family.carmen().accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Nochebuena", "exchangeDate", "2026-12-24"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.drawn")
                .isEqualTo(true);
    }

    // --- helpers ---

    private static String groupOf(Family family) {
        return "/api/v1/groups/" + family.groupId();
    }

    private static String exclusionsOf(Family family) {
        return groupOf(family) + "/exclusions";
    }

    private static JsonNode json(String body) {
        return JSON.readTree(body);
    }

    /** Carmen is the Admin; Luis, Marta and Pedro joined her Group "Navidad". */
    private Family family() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        User pedro = signedInUser("Pedro");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        joinGroup(pedro, carmen, groupId);
        Map<String, String> ids = new HashMap<>();
        Map<String, String> names = new HashMap<>();
        for (JsonNode member : json(get(carmen, "/api/v1/groups/" + groupId)).get("members")) {
            names.put(member.get("id").asString(), member.get("displayName").asString());
        }
        names.forEach((id, name) -> ids.put(name, id));
        return new Family(carmen, luis, marta, pedro, groupId, ids, names);
    }

    /** The Group's Members, with their ids by display name and their display names by id. */
    record Family(
            User carmen,
            User luis,
            User marta,
            User pedro,
            String groupId,
            Map<String, String> idsByName,
            Map<String, String> namesById) {
        String luisId() {
            return idsByName.get("Luis");
        }

        String martaId() {
            return idsByName.get("Marta");
        }
    }

    private static String drawOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/draw";
    }

    private RestTestClient.ResponseSpec runDraw(User by, Family family) {
        return http.post()
                .uri(drawOf(family))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + by.accessToken())
                .exchange();
    }

    private void joinGroup(User user, User admin, String groupId) {
        String inviteCode =
                json(get(admin, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
        post(user, "/api/v1/memberships", Map.of("inviteCode", inviteCode))
                .expectStatus()
                .isOk();
    }

    record User(String accessToken, String email, String displayName) {}

    private String createGroup(User admin, String name) {
        RestTestClient.ResponseSpec created =
                post(admin, "/api/v1/groups", Map.of("name", name, "exchangeDate", "2026-12-24"));
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

    private RestTestClient.ResponseSpec delete(User user, String path) {
        return http.delete()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
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
        return signedInAgain(email, displayName);
    }

    /** Signs the User in now, e.g. after moving the clock past their access token's expiry. */
    private User signedInAgain(String email, String displayName) {
        RestTestClient.ResponseSpec signIn =
                anonymousPost("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
        signIn.expectStatus().isOk();
        return new User(json(signIn).get("accessToken").asString(), email, displayName);
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
