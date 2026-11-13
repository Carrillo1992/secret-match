package com.secretmatch.wishlist;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Duration;
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

/** Ticket #32: a Member writes their Wishes and the whole Group sees them. Every test runs on 2026-12-01. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class WishlistIT {

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
    @DisplayName("a Member adds a Wish with every field, and every Member of the Group reads it")
    void memberAddsAWishAndTheGroupReadsIt() {
        Family family = family();

        RestTestClient.ResponseSpec added = addWish(
                family.luis(),
                family,
                Map.of(
                        "title", "Auriculares",
                        "link", "https://tienda.example/auriculares",
                        "price", 49.9,
                        "notes", "Inalámbricos, negros",
                        "priority", "HIGH"));

        added.expectStatus().isCreated();
        JsonNode wish = json(added);
        assertThat(wish.get("id").asString()).isNotBlank();
        assertThat(wish.get("title").asString()).isEqualTo("Auriculares");
        assertThat(wish.get("link").asString()).isEqualTo("https://tienda.example/auriculares");
        assertThat(wish.get("price").decimalValue()).isEqualByComparingTo("49.90");
        assertThat(wish.get("notes").asString()).isEqualTo("Inalámbricos, negros");
        assertThat(wish.get("priority").asString()).isEqualTo("HIGH");
        for (User reader : List.of(family.carmen(), family.marta(), family.luis())) {
            JsonNode wishlist = json(get(reader, wishlistOf(family, family.luisId())));
            assertThat(wishlist.get("owner").get("displayName").asString()).isEqualTo("Luis");
            assertThat(wishlist.get("wishes")).hasSize(1);
            assertThat(wishlist.get("wishes").get(0)).isEqualTo(wish);
        }
    }

    @Test
    @DisplayName("a Wish with only a title is medium priority, and the Wishlist says whether it is yours")
    void defaultsAndOwnership() {
        Family family = family();
        addWish(family.luis(), family, Map.of("title", "Calcetines"))
                .expectStatus()
                .isCreated();

        JsonNode own = json(get(family.luis(), wishlistOf(family, family.luisId())));
        JsonNode others = json(get(family.marta(), wishlistOf(family, family.luisId())));

        JsonNode wish = own.get("wishes").get(0);
        assertThat(wish.get("priority").asString()).isEqualTo("MEDIUM");
        assertThat(wish.has("link")).as("an absent link is left out").isFalse();
        assertThat(own.get("owner").get("you").asBoolean()).isTrue();
        assertThat(others.get("owner").get("you").asBoolean()).isFalse();
        assertThat(json(get(family.luis(), wishlistOf(family, family.martaId())))
                        .get("wishes"))
                .isEmpty();
    }

    @Test
    @DisplayName("Wishes come high priority first, oldest first within a priority")
    void ordersWishes() {
        Family family = family();
        addWish(family.luis(), family, Map.of("title", "Calcetines", "priority", "LOW"));
        addWish(family.luis(), family, Map.of("title", "Libro"));
        addWish(family.luis(), family, Map.of("title", "Auriculares", "priority", "HIGH"));

        assertThat(titlesIn(json(get(family.carmen(), wishlistOf(family, family.luisId())))))
                .containsExactly("Auriculares", "Libro", "Calcetines");
    }

    @Test
    @DisplayName("the owner edits and deletes a Wish; deleting it again is a 404")
    void ownerEditsAndDeletes() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");

        put(family.luis(), wishesOf(family) + "/" + id, Map.of("title", "Bufanda roja", "priority", "LOW"))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Bufanda roja");
        assertThat(titlesIn(json(get(family.marta(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda roja");

        delete(family.luis(), wishesOf(family) + "/" + id).expectStatus().isNoContent();

        assertThat(json(get(family.marta(), wishlistOf(family, family.luisId())))
                        .get("wishes"))
                .isEmpty();
        delete(family.luis(), wishesOf(family) + "/" + id)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:wish-not-found");
    }

    @Test
    @DisplayName("another Member, even the Admin, cannot edit or delete someone's Wish, and nothing changes")
    void othersAreRefused() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");

        put(family.carmen(), wishesOf(family) + "/" + id, Map.of("title", "Carbón"))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:wish-not-yours");
        delete(family.marta(), wishesOf(family) + "/" + id).expectStatus().isEqualTo(422);

        assertThat(titlesIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda");
    }

    @Test
    @DisplayName("someone outside the Group gets 404 on every Wishlist endpoint, and nothing changes")
    void nonMembersGetNotFound() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");
        User stranger = signedInUser("Desconocido");

        get(stranger, wishlistOf(family, family.luisId()))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        addWish(stranger, family, Map.of("title", "Intruso")).expectStatus().isNotFound();
        put(stranger, wishesOf(family) + "/" + id, Map.of("title", "Intruso"))
                .expectStatus()
                .isNotFound();
        delete(stranger, wishesOf(family) + "/" + id).expectStatus().isNotFound();
        get(family.carmen(), wishlistOf(family, UUID.randomUUID().toString()))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:wishlist-not-found");

        assertThat(titlesIn(json(get(family.carmen(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda");
    }

    @Test
    @DisplayName("javascript: and other non-http(s) links are rejected, on adding and on editing")
    void rejectsUnsafeLinks() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");

        for (String link : List.of("javascript:alert(document.cookie)", "data:text/html,hola", "ftp://x.example/a")) {
            addWish(family.luis(), family, Map.of("title", "Trampa", "link", link))
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:invalid-wish-link");
            put(family.luis(), wishesOf(family) + "/" + id, Map.of("title", "Trampa", "link", link))
                    .expectStatus()
                    .isEqualTo(422);
        }

        assertThat(titlesIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda");
    }

    @Test
    @DisplayName("too long text, a missing title, a negative price or an unknown priority are rejected")
    void rejectsInvalidFields() {
        Family family = family();
        Map<String, Object> tooLongTitle = Map.of("title", "a".repeat(101));
        Map<String, Object> tooLongNotes = Map.of("title", "Libro", "notes", "n".repeat(1001));
        Map<String, Object> tooLongLink = Map.of("title", "Libro", "link", "https://example.com/" + "a".repeat(2000));
        Map<String, Object> negativePrice = Map.of("title", "Libro", "price", -1);
        Map<String, Object> unknownPriority = Map.of("title", "Libro", "priority", "URGENT");
        Map<String, Object> noTitle = new HashMap<>();
        noTitle.put("notes", "sin título");

        for (Map<String, Object> wish :
                List.of(tooLongTitle, tooLongNotes, tooLongLink, negativePrice, unknownPriority, noTitle)) {
            addWish(family.luis(), family, wish).expectStatus().isBadRequest();
        }
        addWish(family.luis(), family, Map.of("title", "   ")).expectStatus().isBadRequest();

        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId()))).get("wishes"))
                .isEmpty();
    }

    @Test
    @DisplayName("Wishlists can still be read and changed after the Draw")
    void worksAfterTheDraw() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");
        joinGroup(signedInUser("Pablo"), family.carmen(), family.groupId());
        post(family.carmen(), "/api/v1/groups/" + family.groupId() + "/draw", Map.of())
                .expectStatus()
                .is2xxSuccessful();

        put(family.luis(), wishesOf(family) + "/" + id, Map.of("title", "Bufanda roja"))
                .expectStatus()
                .isOk();
        addWish(family.luis(), family, Map.of("title", "Guantes"))
                .expectStatus()
                .isCreated();
        assertThat(titlesIn(json(get(family.marta(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda roja", "Guantes");
    }

    @Test
    @DisplayName("leaving the Group or deleting it is not blocked by Wishes, and takes them along")
    void wishesDoNotBlockLeavingOrDeleting() {
        Family family = family();
        addedWishId(family.luis(), family, "Bufanda");
        addedWishId(family.marta(), family, "Plantas");

        delete(family.luis(), "/api/v1/groups/" + family.groupId() + "/members/" + family.luisId())
                .expectStatus()
                .isNoContent();
        get(family.carmen(), wishlistOf(family, family.luisId())).expectStatus().isNotFound();
        // A Wish left behind would break its foreign key to the Group's Members, so the deletion itself would
        // fail: a 204 means none is left.
        delete(family.carmen(), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isNoContent();
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

    private static String wishlistOf(Family family, String memberId) {
        return "/api/v1/groups/" + family.groupId() + "/members/" + memberId + "/wishlist";
    }

    private static String wishesOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/wishes";
    }

    /** Each Wish is added a second after the one before, so "oldest first" is well defined. */
    private RestTestClient.ResponseSpec addWish(User by, Family family, Map<String, ?> wish) {
        clock.advance(Duration.ofSeconds(1));
        return post(by, wishesOf(family), wish);
    }

    private String addedWishId(User by, Family family, String title) {
        RestTestClient.ResponseSpec added = addWish(by, family, Map.of("title", title));
        added.expectStatus().isCreated();
        return json(added).get("id").asString();
    }

    private static List<String> titlesIn(JsonNode wishlist) {
        return wishlist.get("wishes")
                .valueStream()
                .map(wish -> wish.get("title").asString())
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

    private RestTestClient.ResponseSpec put(User user, String path, Map<String, ?> body) {
        return http.put()
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
