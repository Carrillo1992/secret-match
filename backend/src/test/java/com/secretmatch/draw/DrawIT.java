package com.secretmatch.draw;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #28: the Admin runs the Draw and each Member sees their Receiver. Every test runs on 2026-12-01 at 10:00 UTC. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class DrawIT {

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
    JdbcTemplate jdbc;

    @BeforeEach
    void firstOfDecember() {
        clock.set(Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    @DisplayName("the Admin runs the Draw and every Member sees a Receiver of their own, never themselves")
    void adminRunsTheDrawAndEveryMemberSeesTheirReceiver() {
        Family family = family();

        RestTestClient.ResponseSpec drawn = runDraw(family.carmen(), family);

        drawn.expectStatus().isCreated();
        Map<String, String> receiverOf = new HashMap<>();
        for (User member : family.everyone()) {
            JsonNode draw = json(get(member, drawOf(family)).expectStatus().isOk());
            JsonNode receiver = draw.get("myReceiver");
            String receiverId = receiver.get("id").asString();
            assertThat(receiverId).isNotEqualTo(family.idOf(member));
            assertThat(receiver.get("displayName").asString()).isEqualTo(family.nameOf(receiverId));
            receiverOf.put(family.idOf(member), receiverId);
        }
        // Everyone gives once and receives once: the Receivers are the four Members, each exactly once.
        assertThat(receiverOf.values()).containsExactlyInAnyOrderElementsOf(family.ids());
        assertThat(json(drawn).get("myReceiver").get("id").asString()).isEqualTo(receiverOf.get(family.carmenId()));
    }

    @Test
    @DisplayName("before the Draw every Member gets 404 for it, and so does a stranger after it")
    void noDrawToSeeBeforeItIsMadeNorForStrangers() {
        Family family = family();
        User stranger = signedInUser("Desconocido");

        get(family.luis(), drawOf(family))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:draw-not-found");
        runDraw(family.carmen(), family).expectStatus().isCreated();
        get(stranger, drawOf(family)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("only the Admin runs the Draw: a Member gets 422 and a stranger 404, and nothing is drawn")
    void onlyTheAdminRunsTheDraw() {
        Family family = family();
        User stranger = signedInUser("Desconocido");

        runDraw(family.luis(), family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:admin-only");
        runDraw(stranger, family)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        get(family.carmen(), drawOf(family)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("a Group with fewer than 4 Members cannot be drawn")
    void fewerThanFourMembersIsRefused() {
        Family family = family();
        delete(family.pedro(), "/api/v1/groups/" + family.groupId() + "/members/" + family.pedroId())
                .expectStatus()
                .isNoContent();

        runDraw(family.carmen(), family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:not-enough-members");
        get(family.carmen(), drawOf(family)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("a Group is drawn only once: running it again is refused and keeps the first Draw")
    void aSecondDrawIsRefused() {
        Family family = family();
        String first = json(runDraw(family.carmen(), family))
                .get("myReceiver")
                .get("id")
                .asString();

        runDraw(family.carmen(), family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:draw-already-made");
        get(family.carmen(), drawOf(family))
                .expectBody()
                .jsonPath("$.myReceiver.id")
                .isEqualTo(first);
    }

    @Test
    @DisplayName("a finished Group cannot be drawn")
    void finishedGroupIsNotDrawn() {
        Family family = family();
        // 00:00 in Madrid on the day after the Exchange Date (24 December).
        clock.set(Instant.parse("2026-12-24T23:00:00Z"));
        User carmen = signedInAgain(family.carmen().email(), family.carmen().displayName());

        runDraw(carmen, family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-finished");
        get(carmen, drawOf(family)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("Exclusions that leave no valid Draw get a generic error naming nobody, and nothing is stored or sent")
    void impossibleExclusionsGetAGenericError() {
        Family family = family();
        // Carmen may give to nobody.
        exclude(family, family.carmenId(), family.luisId());
        exclude(family, family.carmenId(), family.martaId());
        exclude(family, family.carmenId(), family.pedroId());
        mail.clear();

        String problem = runDraw(family.carmen(), family)
                .expectStatus()
                .isEqualTo(422)
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();

        assertThat(json(problem).get("type").asString()).isEqualTo("urn:secretmatch:problem:no-valid-draw");
        assertThat(problem)
                .doesNotContain(family.ids())
                .doesNotContain(family.idsByName().keySet());
        get(family.carmen(), drawOf(family)).expectStatus().isNotFound();
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("every Member gets exactly one email saying the Draw is made, without anyone's name in it")
    void everyMemberIsEmailedOnceWithoutTheirReceiversName() {
        Family family = family();
        mail.clear();

        runDraw(family.carmen(), family).expectStatus().isCreated();

        assertThat(mail.sent()).hasSize(4);
        for (User member : family.everyone()) {
            List<OutgoingEmail> received = mail.sentTo(member.email());
            assertThat(received).hasSize(1);
            OutgoingEmail email = received.getFirst();
            assertThat(email.subject()).isEqualTo("Ya está hecho el sorteo de «Navidad»");
            assertThat(email.text()).contains("/groups/" + family.groupId());
            for (String name : family.idsByName().keySet()) {
                assertThat(email.subject()).doesNotContain(name);
                assertThat(email.text()).doesNotContain(name);
                assertThat(email.html()).doesNotContain(name);
            }
        }
    }

    @Test
    @DisplayName("deleting a drawn Group deletes its Draw and Assignments, and other Groups keep theirs")
    void groupDeletionDeletesItsDraw() {
        Family family = family();
        Family other = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        runDraw(other.carmen(), other).expectStatus().isCreated();

        // Draw data left behind would break its foreign keys to the Group, so the deletion itself would fail.
        delete(family.carmen(), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isNoContent();

        assertThat(rowsIn("draws", family.groupId())).isZero();
        assertThat(rowsIn("assignments", family.groupId())).isZero();
        assertThat(rowsIn("assignments", other.groupId())).isEqualTo(4);
        get(other.luis(), drawOf(other)).expectStatus().isOk();
    }

    @Test
    @DisplayName("no endpoint lists a Group's Assignments or answers who someone's Giver is: the API surface")
    void apiSurfaceExposesOnlyMyReceiver() {
        JsonNode document =
                json(http.get().uri("/v3/api-docs").exchange().expectStatus().isOk());

        for (Map.Entry<String, JsonNode> path : document.get("paths").properties()) {
            for (Map.Entry<String, JsonNode> operation : path.getValue().properties()) {
                String name = operation.getKey().toUpperCase() + " " + path.getKey();
                assertThat(path.getKey())
                        .as(name)
                        .doesNotContainIgnoringCase("giver")
                        .doesNotContainIgnoringCase("assignment");
                for (JsonNode parameter : operation.getValue().path("parameters")) {
                    assertThat(parameter.get("name").asString())
                            .as(name)
                            .doesNotContainIgnoringCase("giver")
                            .doesNotContainIgnoringCase("receiver");
                }
                if (path.getKey().contains("/draw")) {
                    assertThat(path.getKey()).as(name).isEqualTo("/api/v1/groups/{groupId}/draw");
                }
            }
        }
        List<String> receiverHolders = new ArrayList<>();
        for (Map.Entry<String, JsonNode> schema :
                document.at("/components/schemas").properties()) {
            assertThat(schema.getKey()).doesNotContainIgnoringCase("giver").doesNotContainIgnoringCase("assignment");
            for (Map.Entry<String, JsonNode> property :
                    schema.getValue().path("properties").properties()) {
                assertThat(property.getKey())
                        .as(schema.getKey())
                        .doesNotContainIgnoringCase("giver")
                        .doesNotContainIgnoringCase("assignment");
                if (property.getValue().toString().contains("ReceiverResponse")) {
                    receiverHolders.add(schema.getKey() + "." + property.getKey());
                    // One Receiver, never a list of them.
                    assertThat(property.getValue().has("items"))
                            .as(schema.getKey())
                            .isFalse();
                }
            }
        }
        assertThat(receiverHolders).containsExactly("DrawResponse.myReceiver");
    }

    @Test
    @DisplayName("after the Draw, every GET endpoint answers each Member with their own Receiver at most")
    void everyReadableEndpointShowsOnlyTheCallersReceiver() {
        Family family = family();
        runDraw(family.carmen(), family).expectStatus().isCreated();
        JsonNode document =
                json(http.get().uri("/v3/api-docs").exchange().expectStatus().isOk());

        for (User member : family.everyone()) {
            JsonNode myDraw = json(get(member, drawOf(family)));
            String own = myDraw.at("/myReceiver/id").asString();
            String ownName = myDraw.at("/myReceiver/displayName").asString();
            List<String> myMailboxes = json(get(member, "/api/v1/groups/" + family.groupId() + "/mailboxes"))
                    .valueStream()
                    .map(mailbox -> mailbox.get("id").asString())
                    .toList();
            for (Map.Entry<String, JsonNode> path : document.get("paths").properties()) {
                if (!path.getValue().has("get")) {
                    continue;
                }
                String inGroup = path.getKey().replace("{groupId}", family.groupId());
                List<String> uris;
                if (inGroup.contains("{memberId}")) {
                    uris = family.ids().stream()
                            .map(id -> inGroup.replace("{memberId}", id))
                            .toList();
                } else if (inGroup.contains("{mailboxId}")) {
                    uris = myMailboxes.stream()
                            .map(id -> inGroup.replace("{mailboxId}", id))
                            .toList();
                } else {
                    uris = List.of(inGroup);
                }
                for (String uri : uris) {
                    assertThat(uri).as("a GET this test cannot fill in").doesNotContain("{");
                    String body = get(member, uri)
                            .expectBody(String.class)
                            .returnResult()
                            .getResponseBody();
                    if (uri.endsWith("/draw")) {
                        assertThat(json(body).at("/myReceiver/id").asString()).isEqualTo(own);
                    } else if (uri.endsWith("/mailboxes")) {
                        // The Mailbox with their Receiver names only them; the one with their Giver names nobody.
                        JsonNode mailboxes = json(body);
                        assertThat(mailboxes).hasSize(2);
                        assertThat(mailboxes.get(0).get("receiverDisplayName").asString())
                                .isEqualTo(ownName);
                        assertThat(mailboxes.get(1).get("receiverDisplayName").isNull())
                                .isTrue();
                        assertThat(body).as(uri).doesNotContain(family.ids());
                        family.idsByName().keySet().stream()
                                .filter(name -> !name.equals(ownName))
                                .forEach(name -> assertThat(body).as(uri).doesNotContain(name));
                    } else {
                        assertThat(String.valueOf(body))
                                .as(uri)
                                .doesNotContainIgnoringCase("receiver")
                                .doesNotContainIgnoringCase("giver")
                                .doesNotContainIgnoringCase("assignment");
                    }
                }
            }
        }
    }

    @Test
    @DisplayName("running and reading the Draw logs no Member id or name, so no Assignment pair reaches the logs")
    void theDrawLogsNoAssignment(CapturedOutput output) {
        Family family = family();
        int before = output.getAll().length();

        runDraw(family.carmen(), family).expectStatus().isCreated();
        for (User member : family.everyone()) {
            get(member, drawOf(family)).expectStatus().isOk();
        }

        String logged = output.getAll().substring(before);
        assertThat(logged)
                .doesNotContain(family.ids())
                .doesNotContain(family.idsByName().keySet());
    }

    // --- helpers ---

    private int rowsIn(String table, String groupId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM " + table + " WHERE group_id = ?", Integer.class, UUID.fromString(groupId));
    }

    private void exclude(Family family, String one, String other) {
        post(
                        family.carmen(),
                        "/api/v1/groups/" + family.groupId() + "/exclusions",
                        Map.of("memberIds", List.of(one, other)))
                .expectStatus()
                .isOk();
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

        List<User> everyone() {
            return List.of(carmen, luis, marta, pedro);
        }

        List<String> ids() {
            return List.copyOf(namesById.keySet());
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

        String idOf(User member) {
            return idsByName.get(member.displayName());
        }

        String nameOf(String memberId) {
            return namesById.get(memberId);
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
