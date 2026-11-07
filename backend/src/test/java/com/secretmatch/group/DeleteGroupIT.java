package com.secretmatch.group;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.notification.application.OutgoingEmail;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #24: the Admin deletes a Group. Every test runs on 2026-12-01 at 10:00 UTC. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({
    TestPostgres.class,
    RecordingEmailSender.Config.class,
    MutableClock.Config.class,
    DeleteGroupIT.CleanupListener.class
})
class DeleteGroupIT {

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

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
        cleanup.reset();
    }

    /** Stands in for the modules that keep data in a Group, which delete it when the Group goes. */
    @TestComponent
    static class CleanupListener {

        private final List<GroupDeleted> heard = new CopyOnWriteArrayList<>();
        private volatile boolean failing;

        @EventListener
        void on(GroupDeleted event) {
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
    @DisplayName("the Admin deletes the Group: it is gone for everyone and nothing of it stays in the database")
    void adminDeletes() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        String inviteCode = inviteCodeOf(carmen, groupId);

        deleteGroup(carmen, groupId).expectStatus().isNoContent();

        for (User member : List.of(carmen, luis, marta)) {
            get(member, "/api/v1/groups/" + groupId)
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:group-not-found");
            get(member, "/api/v1/groups").expectBody().json("[]");
        }
        post(signedInUser("Pepe"), "/api/v1/memberships", Map.of("inviteCode", inviteCode))
                .expectStatus()
                .isNotFound();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM groups WHERE id = ?::uuid", Long.class, groupId))
                .isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM group_members WHERE group_id = ?::uuid", Long.class, groupId))
                .isZero();
        assertThat(cleanup.heard).containsExactly(new GroupDeleted(UUID.fromString(groupId)));
    }

    @Test
    @DisplayName("exactly one email to each other Member, none to the Admin")
    void otherMembersAreEmailed() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        mail.clear();

        deleteGroup(carmen, groupId).expectStatus().isNoContent();
        deleteGroup(carmen, groupId).expectStatus().isNotFound();

        assertThat(mail.sent()).extracting(OutgoingEmail::to).containsExactlyInAnyOrder(luis.email(), marta.email());
        assertThat(mail.sent()).allSatisfy(email -> {
            assertThat(email.subject()).isEqualTo("Se ha borrado el grupo «Navidad»");
            assertThat(email.text()).contains("Abuela Carmen").contains("/home");
        });
    }

    @Test
    @DisplayName("only the Admin can delete: a Member gets admin-only, a non-Member 404, and the Group stays")
    void onlyTheAdminDeletes() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User stranger = signedInUser("Desconocido");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        mail.clear();

        deleteGroup(luis, groupId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");
        deleteGroup(stranger, groupId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        http.delete().uri("/api/v1/groups/" + groupId).exchange().expectStatus().isUnauthorized();

        get(luis, "/api/v1/groups/" + groupId)
                .expectBody()
                .jsonPath("$.members.length()")
                .isEqualTo(2);
        assertThat(mail.sent()).isEmpty();
        assertThat(cleanup.heard).isEmpty();
    }

    @Test
    @DisplayName("if deleting the Group's data fails, the Group stays and nobody is emailed")
    void failedCleanupUndoesTheDeletion() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        mail.clear();
        cleanup.failing = true;

        deleteGroup(carmen, groupId).expectStatus().is5xxServerError();

        get(luis, "/api/v1/groups/" + groupId).expectStatus().isOk();
        assertThat(mail.sent()).isEmpty();
    }

    // ---------- helpers ----------

    private RestTestClient.ResponseSpec deleteGroup(User by, String groupId) {
        return http.delete()
                .uri("/api/v1/groups/" + groupId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + by.accessToken())
                .exchange();
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
