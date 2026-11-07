package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.group.application.MembershipEnded;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #22: a Member leaves a Group, and the Admin removes Members, before the Draw. Every test runs on
 * 2026-12-01 at 10:00 UTC.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({
    TestPostgres.class,
    RecordingEmailSender.Config.class,
    MutableClock.Config.class,
    LeaveAndRemoveMembersIT.CleanupListener.class
})
class LeaveAndRemoveMembersIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    @Autowired
    CleanupListener cleanup;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
        cleanup.reset();
    }

    /**
     * Stands in for the Draw (#3) and Wishlist (#4) modules, which delete a Member's Exclusions and Wishlist
     * when their membership ends.
     */
    @TestComponent
    static class CleanupListener {

        private final List<MembershipEnded> heard = new CopyOnWriteArrayList<>();
        private volatile boolean failing;

        @EventListener
        void on(MembershipEnded event) {
            if (failing) {
                throw new IllegalStateException("cleanup failed");
            }
            heard.add(event);
        }

        void reset() {
            heard.clear();
            failing = false;
        }
    }

    @Test
    @DisplayName("a Member leaves: the Group is gone from their list and they get 404 for it afterwards")
    void memberLeaves() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        mail.clear();

        removeMember(luis, groupId, memberIdOf(luis, groupId, "Luis"))
                .expectStatus()
                .isNoContent();

        get(luis, "/api/v1/groups/" + groupId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        get(luis, "/api/v1/groups").expectBody().json("[]");
        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.members[*].displayName")
                .isEqualTo(List.of("Abuela Carmen"));
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("the Admin removes a Member: exactly one email, to the removed Member, and they lose the Group")
    void adminRemovesAMember() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String luisId = memberIdOf(carmen, groupId, "Luis");
        mail.clear();

        removeMember(carmen, groupId, luisId).expectStatus().isNoContent();
        removeMember(carmen, groupId, luisId).expectStatus().isNotFound();

        assertThat(mail.sent()).singleElement().satisfies(email -> {
            assertThat(email.to()).isEqualTo(luis.email());
            assertThat(email.subject()).isEqualTo("Ya no estás en «Navidad»");
            assertThat(email.text()).contains("Abuela Carmen").contains("/home");
        });
        get(luis, "/api/v1/groups/" + groupId).expectStatus().isNotFound();
        get(marta, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.members[*].displayName")
                .isEqualTo(List.of("Abuela Carmen", "Marta"));
    }

    @Test
    @DisplayName("the Admin cannot leave, and a Member who is not the Admin cannot remove anyone")
    void forbiddenRemovals() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String carmenId = memberIdOf(carmen, groupId, "Abuela Carmen");
        mail.clear();

        removeMember(carmen, groupId, carmenId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-cannot-leave");
        removeMember(luis, groupId, memberIdOf(luis, groupId, "Marta"))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");
        removeMember(luis, groupId, carmenId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");

        get(carmen, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.members.length()")
                .isEqualTo(3);
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("a non-Member gets 404 for the Group, and removing someone who is not a Member is a 404 too")
    void unknownGroupOrMember() {
        User carmen = signedInUser("Abuela Carmen");
        User stranger = signedInUser("Desconocido");
        String groupId = createGroup(carmen, "Navidad");
        String carmenId = memberIdOf(carmen, groupId, "Abuela Carmen");

        removeMember(stranger, groupId, carmenId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        removeMember(carmen, groupId, UUID.randomUUID().toString())
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:member-not-found");
        http.delete()
                .uri("/api/v1/groups/" + groupId + "/members/" + carmenId)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    @DisplayName("leaving and removal tell the other modules, so they delete that Member's data in the Group")
    void endedMembershipsAreAnnounced() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String luisId = memberIdOf(carmen, groupId, "Luis");
        String martaId = memberIdOf(carmen, groupId, "Marta");

        removeMember(luis, groupId, luisId).expectStatus().isNoContent();
        removeMember(carmen, groupId, martaId).expectStatus().isNoContent();

        assertThat(cleanup.heard)
                .containsExactly(
                        new MembershipEnded(UUID.fromString(groupId), UUID.fromString(luisId)),
                        new MembershipEnded(UUID.fromString(groupId), UUID.fromString(martaId)));
    }

    @Test
    @DisplayName("if deleting the Member's data fails, they stay a Member and nobody is emailed")
    void failedCleanupUndoesTheRemoval() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        mail.clear();
        cleanup.failing = true;

        removeMember(carmen, groupId, memberIdOf(carmen, groupId, "Luis"))
                .expectStatus()
                .is5xxServerError();

        get(luis, "/api/v1/groups/" + groupId).expectStatus().isOk();
        assertThat(mail.sent()).isEmpty();
    }

    // ---------- helpers ----------

    private RestTestClient.ResponseSpec removeMember(User by, String groupId, String memberId) {
        return http.delete()
                .uri("/api/v1/groups/" + groupId + "/members/" + memberId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + by.accessToken())
                .exchange();
    }

    /** The id of the Member with this display name, as {@code viewer} sees the Group. */
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
