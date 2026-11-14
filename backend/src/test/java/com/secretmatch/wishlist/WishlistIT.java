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

/**
 * Tickets #32 and #33: a Member writes their Wishes, Preferences and Don't List, which only they and, after the
 * Draw, their Giver read (ADR 0004). Every test runs on 2026-12-01.
 */
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
    @DisplayName("a Member adds a Wish with every field and reads it back on their Wishlist")
    void memberAddsAWishAndReadsItBack() {
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
        JsonNode wishlist = json(get(family.luis(), wishlistOf(family, family.luisId())));
        assertThat(wishlist.get("owner").get("displayName").asString()).isEqualTo("Luis");
        assertThat(wishlist.get("owner").get("you").asBoolean()).isTrue();
        assertThat(wishlist.get("wishes")).hasSize(1);
        assertThat(wishlist.get("wishes").get(0)).isEqualTo(wish);
    }

    @Test
    @DisplayName("a Wish with only a title is medium priority, and its absent fields are left out")
    void defaultsAndOwnership() {
        Family family = family();
        addWish(family.luis(), family, Map.of("title", "Calcetines"))
                .expectStatus()
                .isCreated();

        JsonNode own = json(get(family.luis(), wishlistOf(family, family.luisId())));

        JsonNode wish = own.get("wishes").get(0);
        assertThat(wish.get("priority").asString()).isEqualTo("MEDIUM");
        assertThat(wish.has("link")).as("an absent link is left out").isFalse();
        assertThat(json(get(family.marta(), wishlistOf(family, family.martaId())))
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

        assertThat(titlesIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
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
        assertThat(titlesIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda roja");

        delete(family.luis(), wishesOf(family) + "/" + id).expectStatus().isNoContent();

        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId()))).get("wishes"))
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

        assertThat(titlesIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("Bufanda");
    }

    @Test
    @DisplayName("before the Draw a Wishlist is private: every other Member, the Admin included, gets a 404")
    void beforeTheDrawOnlyTheOwnerReads() {
        Family family = family();
        addedWishId(family.luis(), family, "Bufanda");
        JsonNode noSuchWishlist =
                json(get(family.carmen(), wishlistOf(family, UUID.randomUUID().toString())));

        for (User other : List.of(family.carmen(), family.marta())) {
            RestTestClient.ResponseSpec refused = get(other, wishlistOf(family, family.luisId()));
            refused.expectStatus().isNotFound();
            JsonNode problem = json(refused);
            assertThat(problem.get("type").asString())
                    .as("the same answer as for a Wishlist that does not exist")
                    .isEqualTo(noSuchWishlist.get("type").asString())
                    .isEqualTo("urn:secretmatch:problem:wishlist-not-found");
            assertThat(problem.get("detail").asString())
                    .isEqualTo(noSuchWishlist.get("detail").asString());
        }
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
    @DisplayName("after the Draw the owner's Giver reads the Wishlist, nobody else does, and the owner still edits it")
    void afterTheDrawTheGiverReadsIt() {
        Family family = family();
        String id = addedWishId(family.luis(), family, "Bufanda");
        User pablo = signedInUser("Pablo");
        joinGroup(pablo, family.carmen(), family.groupId());
        post(family.carmen(), "/api/v1/groups/" + family.groupId() + "/draw", Map.of())
                .expectStatus()
                .is2xxSuccessful();

        put(family.luis(), wishesOf(family) + "/" + id, Map.of("title", "Bufanda roja"))
                .expectStatus()
                .isOk();
        addWish(family.luis(), family, Map.of("title", "Guantes"))
                .expectStatus()
                .isCreated();

        List<User> others = List.of(family.carmen(), family.marta(), pablo);
        List<User> givers = others.stream()
                .filter(member -> json(get(member, "/api/v1/groups/" + family.groupId() + "/draw"))
                        .at("/myReceiver/id")
                        .asString()
                        .equals(family.luisId()))
                .toList();
        assertThat(givers).hasSize(1);
        User giver = givers.getFirst();
        JsonNode seenByGiver = json(get(giver, wishlistOf(family, family.luisId())));
        assertThat(titlesIn(seenByGiver)).containsExactly("Bufanda roja", "Guantes");
        assertThat(seenByGiver.get("owner").get("you").asBoolean()).isFalse();
        put(giver, wishesOf(family) + "/" + id, Map.of("title", "Carbón"))
                .expectStatus()
                .isEqualTo(422);
        for (User other : others) {
            if (other != giver) {
                get(other, wishlistOf(family, family.luisId()))
                        .expectStatus()
                        .isNotFound()
                        .expectBody()
                        .jsonPath("$.type")
                        .isEqualTo("urn:secretmatch:problem:wishlist-not-found");
            }
        }
    }

    @Test
    @DisplayName("leaving, being removed or deleting the Group is not blocked by Wishes, and takes them along")
    void wishesDoNotBlockLeavingOrDeleting() {
        Family family = family();
        addedWishId(family.luis(), family, "Bufanda");
        addedWishId(family.marta(), family, "Plantas");

        delete(family.luis(), "/api/v1/groups/" + family.groupId() + "/members/" + family.luisId())
                .expectStatus()
                .isNoContent();
        get(family.carmen(), wishlistOf(family, family.luisId())).expectStatus().isNotFound();
        delete(family.carmen(), "/api/v1/groups/" + family.groupId() + "/members/" + family.martaId())
                .expectStatus()
                .isNoContent();
        get(family.carmen(), wishlistOf(family, family.martaId()))
                .expectStatus()
                .isNotFound();
        joinGroup(family.marta(), family.carmen(), family.groupId());
        assertThat(json(get(family.marta(), wishlistOf(family, family.martaId())))
                        .get("wishes"))
                .as("a removed Member who joins again starts with an empty Wishlist")
                .isEmpty();
        // A Wish left behind would break its foreign key to the Group's Members, so the deletion itself would
        // fail: a 204 means none is left.
        delete(family.carmen(), "/api/v1/groups/" + family.groupId())
                .expectStatus()
                .isNoContent();
    }

    @Test
    @DisplayName("a Wishlist nobody filled in has no Preferences and an empty Don't List")
    void emptyPreferencesAndDontList() {
        Family family = family();

        JsonNode own = json(get(family.luis(), wishlistOf(family, family.luisId())));

        assertThat(own.has("preferences")).as("absent Preferences are left out").isFalse();
        assertThat(own.get("dontList").isArray()).isTrue();
        assertThat(own.get("dontList")).isEmpty();
    }

    @Test
    @DisplayName("the owner writes Preferences, reads them on their Wishlist, and clears them with blank text")
    void ownerEditsPreferences() {
        Family family = family();

        put(family.luis(), preferencesOf(family), Map.of("preferences", "  Talla M, me encanta el senderismo "))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.preferences")
                .isEqualTo("Talla M, me encanta el senderismo");
        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId())))
                        .get("preferences")
                        .asString())
                .isEqualTo("Talla M, me encanta el senderismo");

        JsonNode cleared = json(put(family.luis(), preferencesOf(family), Map.of("preferences", "   ")));
        assertThat(cleared.has("preferences")).isFalse();
        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId()))).has("preferences"))
                .isFalse();

        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla L"))
                .expectStatus()
                .isOk();
        put(family.luis(), preferencesOf(family), Map.of()).expectStatus().isOk();
        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId()))).has("preferences"))
                .as("absent Preferences clear them too")
                .isFalse();
    }

    @Test
    @DisplayName("Preferences over 2000 characters are rejected, and the old ones stay")
    void rejectsTooLongPreferences() {
        Family family = family();
        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla M"))
                .expectStatus()
                .isOk();

        put(family.luis(), preferencesOf(family), Map.of("preferences", "p".repeat(2001)))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:invalid-preferences");
        put(family.luis(), preferencesOf(family), Map.of("preferences", " " + "p".repeat(2000) + " "))
                .expectStatus()
                .isOk();

        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId())))
                        .get("preferences")
                        .asString())
                .hasSize(2000);
    }

    @Test
    @DisplayName("the owner adds Don't List entries, reads them oldest first, and removes them")
    void ownerKeepsTheirDontList() {
        Family family = family();

        RestTestClient.ResponseSpec added = addDontListEntry(family.luis(), family, " nada de chocolate ");
        added.expectStatus().isCreated();
        JsonNode chocolate = json(added);
        assertThat(chocolate.get("id").asString()).isNotBlank();
        assertThat(chocolate.get("text").asString()).isEqualTo("nada de chocolate");
        String candles = addedDontListEntryId(family.luis(), family, "nada de velas");
        assertThat(dontListIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("nada de chocolate", "nada de velas");
        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId())))
                        .get("dontList")
                        .get(0))
                .isEqualTo(chocolate);

        delete(family.luis(), dontListOf(family) + "/" + candles).expectStatus().isNoContent();

        assertThat(dontListIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("nada de chocolate");
        delete(family.luis(), dontListOf(family) + "/" + candles)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:dont-list-entry-not-found");
    }

    @Test
    @DisplayName("empty, blank, missing or over 100 characters Don't List entries are rejected")
    void rejectsInvalidDontListEntries() {
        Family family = family();

        for (Map<String, ?> entry : List.<Map<String, ?>>of(
                Map.of("text", ""), Map.of("text", "   "), Map.of(), Map.of("text", "x".repeat(101)))) {
            post(family.luis(), dontListOf(family), entry)
                    .expectStatus()
                    .isEqualTo(422)
                    .expectBody()
                    .jsonPath("$.type")
                    .isEqualTo("urn:secretmatch:problem:invalid-dont-list-entry");
        }
        addDontListEntry(family.luis(), family, "x".repeat(100)).expectStatus().isCreated();

        assertThat(json(get(family.luis(), wishlistOf(family, family.luisId()))).get("dontList"))
                .hasSize(1);
    }

    @Test
    @DisplayName("another Member, even the Admin, cannot remove someone's Don't List entry: it looks like no entry")
    void othersCannotRemoveAnEntry() {
        Family family = family();
        String id = addedDontListEntryId(family.luis(), family, "nada de chocolate");
        JsonNode noSuchEntry = json(delete(family.carmen(), dontListOf(family) + "/" + UUID.randomUUID()));

        for (User other : List.of(family.carmen(), family.marta())) {
            RestTestClient.ResponseSpec refused = delete(other, dontListOf(family) + "/" + id);
            refused.expectStatus().isNotFound();
            JsonNode problem = json(refused);
            assertThat(problem.get("type").asString())
                    .isEqualTo(noSuchEntry.get("type").asString())
                    .isEqualTo("urn:secretmatch:problem:dont-list-entry-not-found");
            assertThat(problem.get("detail").asString())
                    .isEqualTo(noSuchEntry.get("detail").asString());
        }

        assertThat(dontListIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("nada de chocolate");
    }

    @Test
    @DisplayName("someone outside the Group gets 404 on Preferences and the Don't List, and nothing changes")
    void nonMembersCannotTouchPreferencesOrTheDontList() {
        Family family = family();
        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla M"))
                .expectStatus()
                .isOk();
        String id = addedDontListEntryId(family.luis(), family, "nada de chocolate");
        User stranger = signedInUser("Desconocido");

        put(stranger, preferencesOf(family), Map.of("preferences", "Intruso"))
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:group-not-found");
        addDontListEntry(stranger, family, "Intruso").expectStatus().isNotFound();
        delete(stranger, dontListOf(family) + "/" + id).expectStatus().isNotFound();

        JsonNode own = json(get(family.luis(), wishlistOf(family, family.luisId())));
        assertThat(own.get("preferences").asString()).isEqualTo("Talla M");
        assertThat(dontListIn(own)).containsExactly("nada de chocolate");
    }

    @Test
    @DisplayName("Preferences and the Don't List are as private as the Wishlist: only the owner, and the Giver after"
            + " the Draw, read them; the owner still edits them after the Draw")
    void preferencesAndDontListAreOnlyForTheGiver() {
        Family family = family();
        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla M"))
                .expectStatus()
                .isOk();
        addedDontListEntryId(family.luis(), family, "nada de chocolate");
        for (User other : List.of(family.carmen(), family.marta())) {
            get(other, wishlistOf(family, family.luisId())).expectStatus().isNotFound();
        }
        User pablo = signedInUser("Pablo");
        joinGroup(pablo, family.carmen(), family.groupId());
        post(family.carmen(), "/api/v1/groups/" + family.groupId() + "/draw", Map.of())
                .expectStatus()
                .is2xxSuccessful();

        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla L"))
                .expectStatus()
                .isOk();
        String candles = addedDontListEntryId(family.luis(), family, "nada de velas");

        List<User> others = List.of(family.carmen(), family.marta(), pablo);
        User giver = others.stream()
                .filter(member -> json(get(member, "/api/v1/groups/" + family.groupId() + "/draw"))
                        .at("/myReceiver/id")
                        .asString()
                        .equals(family.luisId()))
                .findFirst()
                .orElseThrow();
        JsonNode seenByGiver = json(get(giver, wishlistOf(family, family.luisId())));
        assertThat(seenByGiver.get("preferences").asString()).isEqualTo("Talla L");
        assertThat(dontListIn(seenByGiver)).containsExactly("nada de chocolate", "nada de velas");
        delete(giver, dontListOf(family) + "/" + candles).expectStatus().isNotFound();
        for (User other : others) {
            if (other != giver) {
                get(other, wishlistOf(family, family.luisId()))
                        .expectStatus()
                        .isNotFound()
                        .expectBody()
                        .jsonPath("$.type")
                        .isEqualTo("urn:secretmatch:problem:wishlist-not-found");
            }
        }
        assertThat(dontListIn(json(get(family.luis(), wishlistOf(family, family.luisId())))))
                .containsExactly("nada de chocolate", "nada de velas");
    }

    @Test
    @DisplayName("leaving, being removed or deleting the Group takes Preferences and the Don't List along")
    void preferencesAndDontListGoWithTheMembership() {
        Family family = family();
        put(family.luis(), preferencesOf(family), Map.of("preferences", "Talla M"))
                .expectStatus()
                .isOk();
        addedDontListEntryId(family.luis(), family, "nada de chocolate");
        put(family.marta(), preferencesOf(family), Map.of("preferences", "Plantas"))
                .expectStatus()
                .isOk();
        addedDontListEntryId(family.marta(), family, "nada de velas");
        put(family.carmen(), preferencesOf(family), Map.of("preferences", "Punto de cruz"))
                .expectStatus()
                .isOk();
        addedDontListEntryId(family.carmen(), family, "nada de colonia");

        delete(family.luis(), "/api/v1/groups/" + family.groupId() + "/members/" + family.luisId())
                .expectStatus()
                .isNoContent();
        delete(family.carmen(), "/api/v1/groups/" + family.groupId() + "/members/" + family.martaId())
                .expectStatus()
                .isNoContent();
        joinGroup(family.luis(), family.carmen(), family.groupId());
        joinGroup(family.marta(), family.carmen(), family.groupId());
        for (Map.Entry<User, String> returning : Map.of(
                        family.luis(), family.luisId(), family.marta(), family.martaId())
                .entrySet()) {
            JsonNode own = json(get(returning.getKey(), wishlistOf(family, returning.getValue())));
            assertThat(own.has("preferences"))
                    .as("a Member who joins again starts without Preferences")
                    .isFalse();
            assertThat(own.get("dontList")).as("and with an empty Don't List").isEmpty();
        }
        // Preferences or entries left behind would break their foreign keys to the Group's Members, so the
        // deletion itself would fail: a 204 means none is left.
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

    private static String preferencesOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/preferences";
    }

    private static String dontListOf(Family family) {
        return "/api/v1/groups/" + family.groupId() + "/dont-list";
    }

    /** Each entry is added a second after the one before, so "oldest first" is well defined. */
    private RestTestClient.ResponseSpec addDontListEntry(User by, Family family, String text) {
        clock.advance(Duration.ofSeconds(1));
        return post(by, dontListOf(family), Map.of("text", text));
    }

    private String addedDontListEntryId(User by, Family family, String text) {
        RestTestClient.ResponseSpec added = addDontListEntry(by, family, text);
        added.expectStatus().isCreated();
        return json(added).get("id").asString();
    }

    private static List<String> dontListIn(JsonNode wishlist) {
        return wishlist.get("dontList")
                .valueStream()
                .map(entry -> entry.get("text").asString())
                .toList();
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
