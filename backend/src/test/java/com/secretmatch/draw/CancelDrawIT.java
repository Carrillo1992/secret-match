package com.secretmatch.draw;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.draw.application.DrawCancelled;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Instant;
import java.util.HashMap;
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
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #31: the Admin cancels the Draw, which deletes every Assignment and returns the Group to how it was before
 * it was drawn. Every test runs on 2026-12-01 at 10:00 UTC.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({
    TestPostgres.class,
    RecordingEmailSender.Config.class,
    MutableClock.Config.class,
    CancelDrawIT.CancelledDraws.Config.class
})
class CancelDrawIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String PROBLEM = "urn:secretmatch:problem:";

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CancelledDraws cancelledDraws;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    @DisplayName("cancelling deletes every Assignment: nobody has a Receiver any more and the Group is not drawn")
    void cancelDeletesEveryAssignment() {
        Family family = drawnFamily();

        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        for (User member : family.everyone()) {
            get(member, drawOf(family))
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo(PROBLEM + "draw-not-found");
        }
        get(family.luis(), groupOf(family)).expectBody().jsonPath("$.drawn").isEqualTo(false);
        assertThat(rowsIn("assignments", family.groupId())).isZero();
        assertThat(rowsIn("draws", family.groupId())).isZero();
    }

    @Test
    @DisplayName("after cancelling, the Invite Link works again")
    void inviteLinkWorksAgain() {
        Family family = drawnFamily();
        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        joinGroup(signedInUser("Rosa"), family.carmen(), family.groupId());

        assertThat(json(get(family.carmen(), groupOf(family))).get("members")).hasSize(5);
    }

    @Test
    @DisplayName("after cancelling, a Member can leave again")
    void memberCanLeaveAgain() {
        Family family = drawnFamily();
        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        delete(family.luis(), groupOf(family) + "/members/" + family.luisId())
                .expectStatus()
                .isNoContent();

        assertThat(json(get(family.carmen(), groupOf(family))).get("members")).hasSize(3);
    }

    @Test
    @DisplayName("after cancelling, the Admin can remove a Member again")
    void adminCanRemoveAMemberAgain() {
        Family family = drawnFamily();
        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        delete(family.carmen(), groupOf(family) + "/members/" + family.martaId())
                .expectStatus()
                .isNoContent();

        get(family.marta(), groupOf(family)).expectStatus().isNotFound();
        assertThat(json(get(family.carmen(), groupOf(family))).get("members")).hasSize(3);
    }

    @Test
    @DisplayName("after cancelling, the Admin can create and delete Exclusions again")
    void exclusionsAreEditableAgain() {
        Family family = family();
        String before = createExclusion(family, family.luisId(), family.martaId())
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        createExclusion(family, family.carmenId(), family.pedroId())
                .expectStatus()
                .isOk();
        delete(
                        family.carmen(),
                        exclusionsOf(family) + "/" + json(before).get("id").asString())
                .expectStatus()
                .isNoContent();

        get(family.carmen(), exclusionsOf(family))
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("after cancelling, the Admin can run a new Draw and every Member sees a Receiver again")
    void aNewDrawCanBeRun() {
        Family family = drawnFamily();
        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        runDraw(family.carmen(), family).expectStatus().isCreated();

        for (User member : family.everyone()) {
            get(member, drawOf(family)).expectStatus().isOk();
        }
        get(family.luis(), groupOf(family)).expectBody().jsonPath("$.drawn").isEqualTo(true);
        assertThat(rowsIn("assignments", family.groupId())).isEqualTo(4);
    }

    @Test
    @DisplayName("only the Admin cancels: a Member gets 422 and a stranger 404; the Draw stays and nobody is emailed")
    void onlyTheAdminCancels() {
        Family family = drawnFamily();
        User stranger = signedInUser("Desconocido");
        mail.clear();

        cancelDraw(family.luis(), family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(PROBLEM + "admin-only");
        cancelDraw(stranger, family)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(PROBLEM + "group-not-found");

        assertDrawKept(family);
    }

    @Test
    @DisplayName("cancelling the Draw of a Group that does not exist gets 404")
    void unknownGroupIsNotFound() {
        Family family = family();
        mail.clear();

        http.delete()
                .uri("/api/v1/groups/" + UUID.randomUUID() + "/draw")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + family.carmen().accessToken())
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(PROBLEM + "group-not-found");
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("a Group without a Draw has nothing to cancel: 404, and nobody is emailed")
    void noDrawToCancel() {
        Family family = family();
        mail.clear();

        cancelDraw(family.carmen(), family)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(PROBLEM + "draw-not-found");

        assertThat(mail.sent()).isEmpty();
        assertThat(cancelledDraws.of(family.groupId())).isEmpty();
    }

    @Test
    @DisplayName("the Draw of a finished Group cannot be cancelled: it stays and nobody is emailed")
    void finishedGroupKeepsItsDraw() {
        Family family = drawnFamily();
        // 00:00 in Madrid on the day after the Exchange Date (24 December).
        clock.set(Instant.parse("2026-12-24T23:00:00Z"));
        User carmen = signedInAgain(family.carmen().email(), family.carmen().displayName());
        mail.clear();

        cancelDraw(carmen, family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo(PROBLEM + "group-finished");

        assertThat(rowsIn("assignments", family.groupId())).isEqualTo(4);
        assertThat(mail.sent()).isEmpty();
        assertThat(cancelledDraws.of(family.groupId())).isEmpty();
    }

    @Test
    @DisplayName("every Member gets exactly one email saying the Draw is cancelled, naming nobody")
    void everyMemberIsEmailedOnceNamingNobody() {
        Family family = drawnFamily();
        mail.clear();

        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        assertThat(mail.sent()).hasSize(4);
        for (User member : family.everyone()) {
            List<OutgoingEmail> received = mail.sentTo(member.email());
            assertThat(received).hasSize(1);
            OutgoingEmail email = received.getFirst();
            assertThat(email.subject()).isEqualTo("Se ha cancelado el sorteo de «Navidad»");
            assertThat(email.text()).contains("ya no cuentan").contains("/groups/" + family.groupId());
            for (String name : family.idsByName().keySet()) {
                assertThat(email.subject()).doesNotContain(name);
                assertThat(email.text()).doesNotContain(name);
                assertThat(email.html()).doesNotContain(name);
            }
        }
    }

    @Test
    @DisplayName("cancelling announces it inside the cancelling transaction, so the Mailboxes can go with the Draw")
    void cancellationIsAnnouncedInsideTheTransaction() {
        Family family = drawnFamily();

        cancelDraw(family.carmen(), family).expectStatus().isNoContent();

        assertThat(cancelledDraws.of(family.groupId())).containsExactly(true);
    }

    // --- helpers ---

    private void assertDrawKept(Family family) {
        for (User member : family.everyone()) {
            get(member, drawOf(family)).expectStatus().isOk();
        }
        get(family.luis(), groupOf(family)).expectBody().jsonPath("$.drawn").isEqualTo(true);
        assertThat(mail.sent()).isEmpty();
        assertThat(cancelledDraws.of(family.groupId())).isEmpty();
    }

    /** Records each {@link DrawCancelled} and whether it was published inside a transaction. */
    static class CancelledDraws {

        private final List<Map.Entry<UUID, Boolean>> seen = new CopyOnWriteArrayList<>();

        @EventListener
        void on(DrawCancelled event) {
            seen.add(Map.entry(event.groupId(), TransactionSynchronizationManager.isActualTransactionActive()));
        }

        List<Boolean> of(String groupId) {
            return seen.stream()
                    .filter(entry -> entry.getKey().equals(UUID.fromString(groupId)))
                    .map(Map.Entry::getValue)
                    .toList();
        }

        @TestConfiguration
        static class Config {

            @Bean
            CancelledDraws cancelledDraws() {
                return new CancelledDraws();
            }
        }
    }

    private int rowsIn(String table, String groupId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM " + table + " WHERE group_id = ?", Integer.class, UUID.fromString(groupId));
    }

    private static String groupOf(Family family) {
        return "/api/v1/groups/" + family.groupId();
    }

    private static String drawOf(Family family) {
        return groupOf(family) + "/draw";
    }

    private static String exclusionsOf(Family family) {
        return groupOf(family) + "/exclusions";
    }

    private RestTestClient.ResponseSpec createExclusion(Family family, String one, String other) {
        return post(family.carmen(), exclusionsOf(family), Map.of("memberIds", List.of(one, other)));
    }

    private RestTestClient.ResponseSpec runDraw(User by, Family family) {
        return http.post()
                .uri(drawOf(family))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + by.accessToken())
                .exchange();
    }

    private RestTestClient.ResponseSpec cancelDraw(User by, Family family) {
        return delete(by, drawOf(family));
    }

    private static JsonNode json(String body) {
        return JSON.readTree(body);
    }

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        return JSON.readTree(response.expectBody(String.class).returnResult().getResponseBody());
    }

    /** A {@link #family()} whose Draw Carmen has already run. */
    private Family drawnFamily() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        return family;
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
        for (JsonNode member : json(get(carmen, "/api/v1/groups/" + groupId)).get("members")) {
            ids.put(member.get("displayName").asString(), member.get("id").asString());
        }
        return new Family(carmen, luis, marta, pedro, groupId, ids);
    }

    /** The Group's Members, with their ids by display name. */
    record Family(User carmen, User luis, User marta, User pedro, String groupId, Map<String, String> idsByName) {

        List<User> everyone() {
            return List.of(carmen, luis, marta, pedro);
        }

        String carmenId() {
            return idsByName.get("Abuela Carmen");
        }

        String luisId() {
            return idsByName.get("Luis");
        }

        String martaId() {
            return idsByName.get("Marta");
        }

        String pedroId() {
            return idsByName.get("Pedro");
        }
    }

    record User(String accessToken, String email, String displayName) {}

    private void joinGroup(User user, User admin, String groupId) {
        String inviteCode =
                json(get(admin, "/api/v1/groups/" + groupId)).get("inviteCode").asString();
        post(user, "/api/v1/memberships", Map.of("inviteCode", inviteCode))
                .expectStatus()
                .isOk();
    }

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
}
