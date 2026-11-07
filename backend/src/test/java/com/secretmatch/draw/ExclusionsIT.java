package com.secretmatch.draw;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #27: the Admin manages a Group's Exclusions before the Draw. Every test runs on 2026-12-01 at 10:00 UTC. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class ExclusionsIT {

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
    @DisplayName("the Admin creates an Exclusion between two Members and lists it with their names")
    void adminCreatesAndListsAnExclusion() {
        Family family = family();

        RestTestClient.ResponseSpec created =
                createExclusion(family.carmen(), family, family.luisId(), family.martaId());

        created.expectStatus().isOk();
        JsonNode exclusion = json(created);
        assertThat(exclusion.get("id").asString()).isNotBlank();
        assertThat(namesIn(exclusion)).containsExactlyInAnyOrder("Luis", "Marta");
        JsonNode listed = json(get(family.carmen(), exclusionsOf(family)));
        assertThat(listed).hasSize(1);
        assertThat(listed.get(0).get("id").asString())
                .isEqualTo(exclusion.get("id").asString());
        assertThat(namesIn(listed.get(0))).containsExactlyInAnyOrder("Luis", "Marta");
    }

    @Test
    @DisplayName("setting the same Exclusion in the other order changes nothing")
    void sameExclusionTwiceIsANoOp() {
        Family family = family();
        String id = json(createExclusion(family.carmen(), family, family.luisId(), family.martaId()))
                .get("id")
                .asString();

        createExclusion(family.carmen(), family, family.martaId(), family.luisId())
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(id);
        get(family.carmen(), exclusionsOf(family))
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("an Exclusion of a Member with themselves, or with someone outside the Group, is rejected")
    void rejectsInvalidExclusions() {
        Family family = family();
        User stranger = signedInUser("Desconocido");
        String strangersGroup = createGroup(stranger, "Otro grupo");
        String strangerId = memberIdOf(stranger, strangersGroup, "Desconocido");

        createExclusion(family.carmen(), family, family.luisId(), family.luisId())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:exclusion-same-member");
        createExclusion(family.carmen(), family, family.luisId(), strangerId)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:exclusion-not-a-member");
        post(family.carmen(), exclusionsOf(family), Map.of("memberIds", List.of(family.luisId())))
                .expectStatus()
                .isBadRequest();
        get(family.carmen(), exclusionsOf(family)).expectBody().json("[]");
    }

    @Test
    @DisplayName("a regular Member gets 404 on every Exclusion endpoint, and nothing changes")
    void regularMemberGetsNotFound() {
        Family family = family();
        String id = json(createExclusion(family.carmen(), family, family.luisId(), family.martaId()))
                .get("id")
                .asString();

        get(family.luis(), exclusionsOf(family))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:exclusions-not-found");
        createExclusion(family.luis(), family, family.carmenId(), family.martaId())
                .expectStatus()
                .isNotFound();
        delete(family.luis(), exclusionsOf(family) + "/" + id).expectStatus().isNotFound();
        get(family.luis(), "/api/v1/groups/" + family.groupId())
                .expectBody(String.class)
                .value(group -> assertThat(group).doesNotContainIgnoringCase("exclusion"));

        get(family.carmen(), exclusionsOf(family))
                .expectBody()
                .jsonPath("$[0].id")
                .isEqualTo(id);
    }

    @Test
    @DisplayName("the Admin deletes an Exclusion; deleting it again is a 404")
    void adminDeletesAnExclusion() {
        Family family = family();
        String id = json(createExclusion(family.carmen(), family, family.luisId(), family.martaId()))
                .get("id")
                .asString();

        delete(family.carmen(), exclusionsOf(family) + "/" + id).expectStatus().isNoContent();

        get(family.carmen(), exclusionsOf(family)).expectBody().json("[]");
        delete(family.carmen(), exclusionsOf(family) + "/" + id)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:exclusion-not-found");
    }

    @Test
    @DisplayName("in a finished Group the Admin lists the Exclusions but cannot change them")
    void finishedGroupIsReadOnly() {
        Family family = family();
        String id = json(createExclusion(family.carmen(), family, family.luisId(), family.martaId()))
                .get("id")
                .asString();
        // 00:00 in Madrid on the day after the Exchange Date (24 December).
        clock.set(Instant.parse("2026-12-24T23:00:00Z"));
        User carmen = signedInAgain(family.carmen().email());

        get(carmen, exclusionsOf(family)).expectBody().jsonPath("$.length()").isEqualTo(1);
        createExclusion(carmen, family, family.carmenId(), family.luisId())
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-finished");
        delete(carmen, exclusionsOf(family) + "/" + id).expectStatus().isEqualTo(422);
        get(carmen, exclusionsOf(family)).expectBody().jsonPath("$.length()").isEqualTo(1);
    }

    @Test
    @DisplayName("a Member who leaves takes their Exclusions with them; the rest stay")
    void leavingDeletesTheMembersExclusions() {
        Family family = family();
        createExclusion(family.carmen(), family, family.luisId(), family.martaId());
        createExclusion(family.carmen(), family, family.carmenId(), family.luisId());
        createExclusion(family.carmen(), family, family.carmenId(), family.martaId());

        delete(family.luis(), "/api/v1/groups/" + family.groupId() + "/members/" + family.luisId())
                .expectStatus()
                .isNoContent();

        JsonNode left = json(get(family.carmen(), exclusionsOf(family)));
        assertThat(left).hasSize(1);
        assertThat(namesIn(left.get(0))).containsExactlyInAnyOrder("Abuela Carmen", "Marta");
    }

    @Test
    @DisplayName("a removed Member's Exclusions go, and they can join again without any")
    void removalDeletesTheMembersExclusions() {
        Family family = family();
        createExclusion(family.carmen(), family, family.luisId(), family.martaId());

        delete(family.carmen(), "/api/v1/groups/" + family.groupId() + "/members/" + family.martaId())
                .expectStatus()
                .isNoContent();
        get(family.carmen(), exclusionsOf(family)).expectBody().json("[]");

        joinGroup(family.marta(), family.carmen(), family.groupId());
        get(family.carmen(), exclusionsOf(family)).expectBody().json("[]");
    }

    @Test
    @DisplayName("deleting the Group deletes its Exclusions, and other Groups keep theirs")
    void groupDeletionDeletesItsExclusions() {
        Family family = family();
        createExclusion(family.carmen(), family, family.luisId(), family.martaId());
        Family other = family();
        createExclusion(other.carmen(), other, other.luisId(), other.martaId());

        // An Exclusion left behind would break its foreign keys to the Group and its Members, so the deletion
        // itself would fail: a 204 means none is left.
        delete(family.carmen(), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isNoContent();

        get(family.carmen(), exclusionsOf(family)).expectStatus().isNotFound();
        get(other.carmen(), exclusionsOf(other))
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(1);
    }

    // --- helpers ---

    /** Carmen is the Admin; Luis and Marta joined her Group "Navidad". */
    private Family family() {
        User carmen = signedInUser("Abuela Carmen");
        User luis = signedInUser("Luis");
        User marta = signedInUser("Marta");
        String groupId = createGroup(carmen, "Navidad");
        joinGroup(luis, carmen, groupId);
        joinGroup(marta, carmen, groupId);
        return new Family(
                carmen,
                luis,
                marta,
                groupId,
                memberIdOf(carmen, groupId, "Abuela Carmen"),
                memberIdOf(carmen, groupId, "Luis"),
                memberIdOf(carmen, groupId, "Marta"));
    }

    record Family(User carmen, User luis, User marta, String groupId, String carmenId, String luisId, String martaId) {}

    private static String exclusionsOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/exclusions";
    }

    private RestTestClient.ResponseSpec createExclusion(User by, Family family, String one, String other) {
        return post(by, exclusionsOf(family), Map.of("memberIds", List.of(one, other)));
    }

    private static List<String> namesIn(JsonNode exclusion) {
        return exclusion
                .get("members")
                .valueStream()
                .map(member -> member.get("displayName").asString())
                .toList();
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

    record User(String accessToken, String email) {}

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

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        return JSON.readTree(response.expectBody(String.class).returnResult().getResponseBody());
    }
}
