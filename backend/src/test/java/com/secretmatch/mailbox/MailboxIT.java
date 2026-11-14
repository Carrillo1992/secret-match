package com.secretmatch.mailbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Duration;
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

/**
 * Ticket #36: the Giver writes to their Receiver and the Receiver answers, one Mailbox per Assignment. Every test
 * starts on 2026-12-01; the Exchange Date is 2026-12-24.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class MailboxIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final Pattern DATE_ONLY = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
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
    @DisplayName("before the Draw a Member has no Mailboxes, and someone outside the Group gets a 404")
    void noMailboxesBeforeTheDraw() {
        Family family = family();
        User stranger = signedInUser("Desconocido");

        for (Member member : family.members()) {
            assertThat(json(get(member.user(), mailboxesOf(family))))
                    .as("%s's Mailboxes", member.name())
                    .isEmpty();
        }
        get(stranger, mailboxesOf(family))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        get(family.carmen().user(), "/api/v1/groups/" + UUID.randomUUID() + "/mailboxes")
                .expectStatus()
                .isNotFound();
    }

    @Test
    @DisplayName("after the Draw each Member sees two Mailboxes: with their Receiver, named, then with their Giver")
    void eachMemberSeesTheirTwoMailboxes() {
        Drawn drawn = drawnFamily();

        for (Member member : drawn.family().members()) {
            JsonNode mailboxes = json(get(member.user(), mailboxesOf(drawn.family())));
            assertThat(mailboxes).as("%s's Mailboxes", member.name()).hasSize(2);
            Member receiver = drawn.receiverOf(member);
            Member giver = drawn.giverOf(member);
            assertThat(mailboxes.get(0).get("side").asString()).isEqualTo("GIVER");
            assertThat(mailboxes.get(0).get("receiverDisplayName").asString()).isEqualTo(receiver.name());
            assertThat(mailboxes.get(1).get("side").asString()).isEqualTo("RECEIVER");
            assertThat(mailboxes.get(1).get("receiverDisplayName").isNull()).isTrue();
            assertThat(mailboxes.get(0).get("id").asString())
                    .as("the same Mailbox as the Receiver sees it")
                    .isEqualTo(mailboxIdOf(receiver, drawn, "RECEIVER"));
            assertThat(mailboxes.get(1).get("id").asString()).isEqualTo(mailboxIdOf(giver, drawn, "GIVER"));
            assertThat(json(get(member.user(), mailboxesOf(drawn.family()))))
                    .as("listing again finds the same Mailboxes")
                    .isEqualTo(mailboxes);
        }
    }

    @Test
    @DisplayName("Mailbox ids are opaque: none is the id of a User, Member or the Group")
    void mailboxIdsAreOpaque() {
        Drawn drawn = drawnFamily();
        List<String> mailboxIds = new ArrayList<>();
        for (Member member : drawn.family().members()) {
            json(get(member.user(), mailboxesOf(drawn.family())))
                    .forEach(mailbox -> mailboxIds.add(mailbox.get("id").asString()));
        }
        List<String> otherIds = new ArrayList<>(List.of(drawn.family().groupId()));
        drawn.family().members().forEach(member -> otherIds.add(member.id()));

        assertThat(mailboxIds).hasSize(8).doesNotContainAnyElementsOf(otherIds);
        assertThat(mailboxIds.stream().distinct())
                .as("one Mailbox per Assignment")
                .hasSize(4);
    }

    @Test
    @DisplayName("the Giver writes, the Receiver reads and answers, and both see the conversation oldest first")
    void giverAndReceiverTalk() {
        clock.set(Instant.parse("2026-12-01T23:55:00Z"));
        Drawn drawn = drawnFamily();
        Member giver = drawn.family().luis();
        Member receiver = drawn.receiverOf(giver);
        String mailbox = mailboxIdOf(giver, drawn, "GIVER");

        RestTestClient.ResponseSpec sent = send(giver, mailbox, "¿Qué talla usas?");
        sent.expectStatus().isCreated();
        JsonNode question = json(sent);
        assertThat(question.get("mine").asBoolean()).isTrue();
        assertThat(question.get("text").asString()).isEqualTo("¿Qué talla usas?");
        assertThat(question.get("sentOn").asString()).isEqualTo("2026-12-01");
        clock.advance(Duration.ofMinutes(10));
        send(receiver, mailbox, "La M, ¡gracias!").expectStatus().isCreated();

        JsonNode seenByReceiver = json(get(receiver.user(), messagesOf(mailbox)));
        assertThat(seenByReceiver).hasSize(2);
        assertThat(seenByReceiver.get(0).get("mine").asBoolean()).isFalse();
        assertThat(seenByReceiver.get(0).get("text").asString()).isEqualTo("¿Qué talla usas?");
        assertThat(seenByReceiver.get(1).get("mine").asBoolean()).isTrue();
        assertThat(seenByReceiver.get(1).get("sentOn").asString()).isEqualTo("2026-12-02");
        JsonNode seenByGiver = json(get(giver.user(), messagesOf(mailbox)));
        assertThat(seenByGiver.valueStream().map(message -> message.get("mine").asBoolean()))
                .containsExactly(true, false);
        assertThat(seenByGiver.get(1).get("text").asString()).isEqualTo("La M, ¡gracias!");
        assertThat(json(get(giver.user(), messagesOf(mailboxIdOf(giver, drawn, "RECEIVER")))))
                .as("the Giver's other Mailbox is a different conversation")
                .isEmpty();
    }

    @Test
    @DisplayName("what the Receiver gets names nothing about their Giver, and Messages carry only their date")
    void receiverSideNamesNothingAboutTheGiver() {
        Drawn drawn = drawnFamily();
        Member receiver = drawn.family().luis();
        Member giver = drawn.giverOf(receiver);
        String mailbox = mailboxIdOf(receiver, drawn, "RECEIVER");
        send(giver, mailbox, "¿Te gusta el chocolate?").expectStatus().isCreated();
        send(receiver, mailbox, "¡Mucho!").expectStatus().isCreated();

        String mailboxes = body(get(receiver.user(), mailboxesOf(drawn.family())));
        String messages = body(get(receiver.user(), messagesOf(mailbox)));

        JsonNode fromGiver = JSON.readTree(mailboxes).get(1);
        assertThat(fromGiver.propertyNames()).containsExactlyInAnyOrder("id", "side", "receiverDisplayName");
        assertThat(fromGiver.get("side").asString()).isEqualTo("RECEIVER");
        assertThat(fromGiver.get("receiverDisplayName").isNull()).isTrue();
        for (JsonNode message : JSON.readTree(messages)) {
            assertThat(message.propertyNames()).containsExactlyInAnyOrder("mine", "text", "sentOn");
            assertThat(message.get("sentOn").asString())
                    .matches(DATE_ONLY)
                    .doesNotContain("T")
                    .isEqualTo("2026-12-01");
        }
        for (String giverDetail : List.of(giver.id(), giver.name(), giver.user().email())) {
            assertThat(mailboxes).doesNotContain(giverDetail);
            assertThat(messages).doesNotContain(giverDetail);
        }
    }

    @Test
    @DisplayName("any other Member, the Admin included, gets a 404 on someone else's Mailbox, and nothing is stored")
    void othersGetNotFound() {
        Drawn drawn = drawnFamily();
        Member admin = drawn.family().carmen();
        Member giver = drawn.family().members().stream()
                .filter(member -> member != admin && drawn.receiverOf(member) != admin)
                .findFirst()
                .orElseThrow();
        Member receiver = drawn.receiverOf(giver);
        String mailbox = mailboxIdOf(giver, drawn, "GIVER");
        send(giver, mailbox, "Hola").expectStatus().isCreated();
        User stranger = signedInUser("Desconocido");
        Member otherGroupMember = drawnFamily().family().luis();
        get(otherGroupMember.user(), mailboxesOf(drawn.family())).expectStatus().isNotFound();

        List<User> outsiders = new ArrayList<>(List.of(stranger, otherGroupMember.user()));
        drawn.family().members().stream()
                .filter(member -> member != giver && member != receiver)
                .forEach(member -> outsiders.add(member.user()));
        assertThat(outsiders).hasSize(4).contains(admin.user());
        for (User outsider : outsiders) {
            get(outsider, messagesOf(mailbox))
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:mailbox-not-found");
            send(outsider, mailbox, "Intruso").expectStatus().isNotFound();
        }
        get(giver.user(), messagesOf(UUID.randomUUID().toString()))
                .expectStatus()
                .isNotFound();
        send(giver, UUID.randomUUID().toString(), "Hola").expectStatus().isNotFound();

        assertThat(json(get(receiver.user(), messagesOf(mailbox)))).hasSize(1);
    }

    @Test
    @DisplayName("an empty, blank or too long Message is rejected; 1000 characters is fine")
    void rejectsInvalidMessages() {
        Drawn drawn = drawnFamily();
        Member giver = drawn.family().luis();
        String mailbox = mailboxIdOf(giver, drawn, "GIVER");
        Map<String, Object> noText = new HashMap<>();
        noText.put("text", null);

        for (Map<String, ?> message : List.of(
                Map.of("text", ""),
                Map.of("text", "   \n "),
                Map.of("text", "\u200b\u00a0\ufeff"),
                Map.of("text", "hola\u0000"),
                Map.of("text", "a".repeat(1001)),
                noText)) {
            post(giver.user(), messagesOf(mailbox), message)
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:invalid-message");
        }
        assertThat(json(get(giver.user(), messagesOf(mailbox)))).isEmpty();

        send(giver, mailbox, "a".repeat(1000)).expectStatus().isCreated();
        assertThat(json(get(giver.user(), messagesOf(mailbox)))
                        .get(0)
                        .get("text")
                        .asString())
                .hasSize(1000);
    }

    @Test
    @DisplayName("deleting the Group takes its Mailboxes and Messages along")
    void deletingTheGroupTakesMailboxesAlong() {
        Drawn drawn = drawnFamily();
        Member giver = drawn.family().luis();
        String mailbox = mailboxIdOf(giver, drawn, "GIVER");
        send(giver, mailbox, "Hola").expectStatus().isCreated();

        // A Mailbox left behind would break its foreign key to the Group's Members, so the deletion itself would
        // fail: a 204 means none is left.
        delete(
                        drawn.family().carmen().user(),
                        "/api/v1/groups/" + drawn.family().groupId())
                .expectStatus()
                .isNoContent();
        get(giver.user(), messagesOf(mailbox)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("a Giver who deletes their account leaves their Receiver the Mailbox, anonymous, with its Messages")
    void aDeletedGiverLeavesTheMailboxToTheReceiver() {
        Drawn drawn = drawnFamily();
        Member luis = drawn.family().luis();
        Member receiver = drawn.receiverOf(luis);
        Member luisGiver = drawn.giverOf(luis);
        String mailbox = mailboxIdOf(luis, drawn, "GIVER");
        send(luis, mailbox, "¿Qué talla usas?").expectStatus().isCreated();
        send(receiver, mailbox, "La M").expectStatus().isCreated();
        String before = body(get(receiver.user(), mailboxesOf(drawn.family())));
        clock.set(Instant.parse("2026-12-26T10:00:00Z"));
        User luisNow = signedInAgain(luis.user().email());
        User receiverNow = signedInAgain(receiver.user().email());
        User luisGiverNow = signedInAgain(luisGiver.user().email());

        delete(luisNow, "/api/v1/users/me").expectStatus().isNoContent();

        String after = body(get(receiverNow, mailboxesOf(drawn.family())));
        assertThat(JSON.readTree(after))
                .as("the Receiver's Mailboxes look just as before, \"Tu Giver\" included")
                .isEqualTo(JSON.readTree(before));
        JsonNode messages = json(get(receiverNow, messagesOf(mailbox)));
        assertThat(messages.valueStream().map(message -> message.get("mine").asBoolean()))
                .containsExactly(false, true);
        assertThat(messages.get(0).get("text").asString()).isEqualTo("¿Qué talla usas?");
        send(receiverNow, mailbox, "¿Sigues ahí?").expectStatus().isCreated();
        for (String luisDetail : List.of(luis.id(), luis.name(), luis.user().email())) {
            assertThat(after).doesNotContain(luisDetail);
            assertThat(body(get(receiverNow, messagesOf(mailbox)))).doesNotContain(luisDetail);
        }
        // Still nobody else's.
        get(luisGiverNow, messagesOf(mailbox)).expectStatus().isNotFound();
    }

    @Test
    @DisplayName("a Receiver who deletes their account takes the Mailbox with their Giver along")
    void aDeletedReceiverTakesTheMailboxAlong() {
        Drawn drawn = drawnFamily();
        Member luis = drawn.family().luis();
        Member giver = drawn.giverOf(luis);
        String mailbox = mailboxIdOf(luis, drawn, "RECEIVER");
        send(giver, mailbox, "Hola").expectStatus().isCreated();
        clock.set(Instant.parse("2026-12-26T10:00:00Z"));
        User luisNow = signedInAgain(luis.user().email());
        User giverNow = signedInAgain(giver.user().email());

        delete(luisNow, "/api/v1/users/me").expectStatus().isNoContent();

        get(giverNow, messagesOf(mailbox)).expectStatus().isNotFound();
        send(giverNow, mailbox, "¿Hola?").expectStatus().isNotFound();
        assertThat(json(get(giverNow, mailboxesOf(drawn.family())))
                        .valueStream()
                        .map(item -> item.get("side").asString()))
                .as("Luis's Giver keeps the Mailbox with their own Giver, and has no Receiver any more")
                .containsExactly("RECEIVER");
    }

    @Test
    @DisplayName("cancelling the Draw takes its Mailboxes and Messages along, and no longer blocks leaving")
    void cancellingTheDrawTakesMailboxesAlong() {
        Drawn drawn = drawnFamily();
        Member luis = drawn.family().luis();
        String mailbox = mailboxIdOf(luis, drawn, "GIVER");
        send(luis, mailbox, "Hola").expectStatus().isCreated();
        UUID groupId = UUID.fromString(drawn.family().groupId());

        // What cancelling a Draw will do: its Assignments and its row go, and the Group is no longer drawn.
        jdbc.update("DELETE FROM assignments WHERE group_id = ?", groupId);
        jdbc.update("DELETE FROM draws WHERE group_id = ?", groupId);
        jdbc.update("UPDATE groups SET drawn = FALSE WHERE id = ?", groupId);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM mailboxes WHERE group_id = ?", Long.class, groupId))
                .isZero();
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM messages WHERE mailbox_id = ?", Long.class, UUID.fromString(mailbox)))
                .isZero();
        get(luis.user(), messagesOf(mailbox)).expectStatus().isNotFound();
        assertThat(json(get(luis.user(), mailboxesOf(drawn.family())))).isEmpty();
        delete(luis.user(), "/api/v1/groups/" + groupId + "/members/" + luis.id())
                .expectStatus()
                .isNoContent();
    }

    @Test
    @DisplayName("a Mailbox whose Assignment changed is a 404 to its old pair, who get new Mailboxes")
    void aMailboxOfAnOldAssignmentIsGone() {
        Drawn drawn = drawnFamily();
        // In the 4-cycle g1 -> r1 -> g2 -> r2 -> g1, swap the Receivers of g1 and g2.
        Member g1 = drawn.family().luis();
        Member r1 = drawn.receiverOf(g1);
        Member g2 = drawn.receiverOf(r1);
        Member r2 = drawn.receiverOf(g2);
        String old = mailboxIdOf(g1, drawn, "GIVER");
        send(g1, old, "Hola").expectStatus().isCreated();
        UUID groupId = UUID.fromString(drawn.family().groupId());

        jdbc.update(
                "DELETE FROM assignments WHERE group_id = ? AND giver_id IN (?, ?)",
                groupId,
                UUID.fromString(g1.id()),
                UUID.fromString(g2.id()));
        jdbc.update(
                "INSERT INTO assignments (group_id, giver_id, receiver_id) VALUES (?, ?, ?), (?, ?, ?)",
                groupId,
                UUID.fromString(g1.id()),
                UUID.fromString(r2.id()),
                groupId,
                UUID.fromString(g2.id()),
                UUID.fromString(r1.id()));

        for (Member oldPartner : List.of(g1, r1)) {
            get(oldPartner.user(), messagesOf(old)).expectStatus().isNotFound();
            send(oldPartner, old, "¿Hola?").expectStatus().isNotFound();
            assertThat(json(get(oldPartner.user(), mailboxesOf(drawn.family())))
                            .valueStream()
                            .map(mailbox -> mailbox.get("id").asString()))
                    .hasSize(2)
                    .doesNotContain(old);
        }
    }

    @Test
    @DisplayName("listing Mailboxes and sending Messages logs no Mailbox id, Message text or Member id")
    void theMailboxLogsNothingAboutWhoTalks(CapturedOutput output) {
        Drawn drawn = drawnFamily();
        int before = output.getAll().length();
        List<String> mailboxIds = new ArrayList<>();

        for (Member member : drawn.family().members()) {
            json(get(member.user(), mailboxesOf(drawn.family())))
                    .forEach(mailbox -> mailboxIds.add(mailbox.get("id").asString()));
            String mine = mailboxIdOf(member, drawn, "GIVER");
            send(member, mine, "Mensaje secreto de " + member.name())
                    .expectStatus()
                    .isCreated();
            get(member.user(), messagesOf(mine)).expectStatus().isOk();
            send(member, mine, "").expectStatus().isEqualTo(422);
        }

        String logged = output.getAll().substring(before);
        assertThat(logged).doesNotContain(mailboxIds).doesNotContain("Mensaje secreto");
        drawn.family().members().forEach(member -> assertThat(logged).doesNotContain(member.id()));
    }

    // --- helpers ---

    /** Carmen is the Admin; Luis, Marta and Pablo joined her Group "Navidad". */
    private Family family() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        User pablo = signedInUser("Pablo");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        joinGroup(pablo, carmen, groupId);
        return new Family(
                groupId,
                new Member("Abuela Carmen", memberIdOf(carmen, groupId, "Abuela Carmen"), carmen),
                new Member("Luis", memberIdOf(carmen, groupId, "Luis"), luis),
                new Member("Marta", memberIdOf(carmen, groupId, "Marta"), marta),
                new Member("Pablo", memberIdOf(carmen, groupId, "Pablo"), pablo));
    }

    /** The family's Group, drawn, with who gives to whom as each Member sees their own Receiver. */
    private Drawn drawnFamily() {
        Family family = family();
        post(family.carmen().user(), "/api/v1/groups/" + family.groupId() + "/draw", Map.of())
                .expectStatus()
                .isCreated();
        Map<String, String> receiverIds = new HashMap<>();
        for (Member member : family.members()) {
            receiverIds.put(
                    member.id(),
                    json(get(member.user(), "/api/v1/groups/" + family.groupId() + "/draw"))
                            .at("/myReceiver/id")
                            .asString());
        }
        return new Drawn(family, receiverIds);
    }

    record Family(String groupId, Member carmen, Member luis, Member marta, Member pablo) {

        List<Member> members() {
            return List.of(carmen, luis, marta, pablo);
        }

        Member withId(String id) {
            return members().stream()
                    .filter(member -> member.id().equals(id))
                    .findFirst()
                    .orElseThrow();
        }
    }

    record Drawn(Family family, Map<String, String> receiverIds) {

        Member receiverOf(Member giver) {
            return family.withId(receiverIds.get(giver.id()));
        }

        Member giverOf(Member receiver) {
            return family.members().stream()
                    .filter(member -> receiverIds.get(member.id()).equals(receiver.id()))
                    .findFirst()
                    .orElseThrow();
        }
    }

    /** {@code id} is their Member id, which is the id of the User they are. */
    record Member(String name, String id, User user) {}

    record User(String accessToken, String email) {}

    /** The id of the Mailbox where {@code member} is on {@code side}. */
    private String mailboxIdOf(Member member, Drawn drawn, String side) {
        for (JsonNode mailbox : json(get(member.user(), mailboxesOf(drawn.family())))) {
            if (mailbox.get("side").asString().equals(side)) {
                return mailbox.get("id").asString();
            }
        }
        throw new AssertionError(member.name() + " has no " + side + " Mailbox");
    }

    private static String mailboxesOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/mailboxes";
    }

    private static String messagesOf(String mailboxId) {
        return "/api/v1/mailboxes/" + mailboxId + "/messages";
    }

    /** Each Message is sent a second after the one before, so "oldest first" is well defined. */
    private RestTestClient.ResponseSpec send(Member author, String mailboxId, String text) {
        return send(author.user(), mailboxId, text);
    }

    private RestTestClient.ResponseSpec send(User author, String mailboxId, String text) {
        clock.advance(Duration.ofSeconds(1));
        return post(author, messagesOf(mailboxId), Map.of("text", text));
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
        return signedInAgain(email);
    }

    /** Signs the User in now, e.g. after moving the clock past their access token's expiry. */
    private User signedInAgain(String email) {
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

    private static String body(RestTestClient.ResponseSpec response) {
        return response.expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();
    }

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        return JSON.readTree(response.expectBody(String.class).returnResult().getResponseBody());
    }
}
