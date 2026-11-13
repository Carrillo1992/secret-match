package com.secretmatch.wishlist.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.group.application.MembershipEnded;
import com.secretmatch.wishlist.domain.GroupNotFoundException;
import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.NotYourWishException;
import com.secretmatch.wishlist.domain.Priority;
import com.secretmatch.wishlist.domain.Wish;
import com.secretmatch.wishlist.domain.WishNotFoundException;
import com.secretmatch.wishlist.domain.WishlistNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MemberWishlistsTest {

    private static final UUID GROUP = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID OTHER_GROUP = UUID.fromString("00000000-0000-0000-0000-00000000000b");
    private static final UUID CARMEN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID LUIS = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID STRANGER = UUID.fromString("00000000-0000-0000-0000-000000000009");

    private final InMemoryWishes stored = new InMemoryWishes();
    private final FakeGroupMembers members = new FakeGroupMembers();
    private final MemberWishlists wishlists =
            new MemberWishlists(stored, members, Clock.fixed(Instant.parse("2026-12-01T10:00:00Z"), ZoneOffset.UTC));

    {
        members.put(GROUP, List.of(member(CARMEN, "Abuela Carmen"), member(LUIS, "Luis")));
        members.put(OTHER_GROUP, List.of(member(LUIS, "Luis")));
    }

    @Test
    @DisplayName("a Member adds Wishes to their own Wishlist, and any Member of the Group reads it with their name")
    void anyMemberReadsAWishlist() {
        StoredWish added = wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));

        WishlistDetails seenByCarmen = wishlists.wishlistOf(GROUP, CARMEN, LUIS);
        WishlistDetails seenByLuis = wishlists.wishlistOf(GROUP, LUIS, LUIS);

        assertThat(seenByCarmen.owner()).isEqualTo(new WishlistDetails.Owner(LUIS, "Luis", false));
        assertThat(seenByCarmen.wishes()).containsExactly(added);
        assertThat(seenByLuis.owner().you()).isTrue();
        assertThat(wishlists.wishlistOf(GROUP, LUIS, CARMEN).wishes()).isEmpty();
    }

    @Test
    @DisplayName("Wishes come high priority first, and in the order they were added within a priority")
    void ordersByPriorityThenAge() {
        wishlists.addWish(GROUP, LUIS, wish("Calcetines", Priority.LOW));
        wishlists.addWish(GROUP, LUIS, wish("Libro", Priority.MEDIUM));
        wishlists.addWish(GROUP, LUIS, wish("Auriculares", Priority.HIGH));
        wishlists.addWish(GROUP, LUIS, wish("Taza", Priority.MEDIUM));

        assertThat(wishlists.wishlistOf(GROUP, CARMEN, LUIS).wishes())
                .extracting(stored -> stored.wish().title())
                .containsExactly("Auriculares", "Libro", "Taza", "Calcetines");
    }

    @Test
    @DisplayName("a Wishlist is per Group: the same Member's Wishes in another Group are not in it")
    void wishlistsArePerGroup() {
        wishlists.addWish(OTHER_GROUP, LUIS, wish("Bicicleta", Priority.HIGH));

        assertThat(wishlists.wishlistOf(GROUP, CARMEN, LUIS).wishes()).isEmpty();
    }

    @Test
    @DisplayName("someone outside the Group gets 'no such Group' on every use case, and nothing changes")
    void nonMembersSeeNoGroup() {
        StoredWish added = wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));

        assertThatThrownBy(() -> wishlists.wishlistOf(GROUP, STRANGER, LUIS))
                .isInstanceOf(GroupNotFoundException.class);
        assertThatThrownBy(() -> wishlists.addWish(GROUP, STRANGER, wish("Algo", Priority.LOW)))
                .isInstanceOf(GroupNotFoundException.class);
        assertThatThrownBy(() -> wishlists.editWish(GROUP, STRANGER, added.id(), wish("Algo", Priority.LOW)))
                .isInstanceOf(GroupNotFoundException.class);
        assertThatThrownBy(() -> wishlists.deleteWish(GROUP, STRANGER, added.id()))
                .isInstanceOf(GroupNotFoundException.class);
        assertThat(stored.all()).containsExactly(added);
    }

    @Test
    @DisplayName("the Wishlist of someone who is not a Member of the Group does not exist")
    void wishlistOfANonMember() {
        assertThatThrownBy(() -> wishlists.wishlistOf(GROUP, CARMEN, STRANGER))
                .isInstanceOf(WishlistNotFoundException.class);
    }

    @Test
    @DisplayName("the owner edits a Wish, and every field is replaced")
    void ownerEditsAWish() {
        StoredWish added = wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));
        Wish edited = new Wish("Bufanda roja", "https://tienda.example/bufanda", null, "Larga", Priority.HIGH);

        StoredWish result = wishlists.editWish(GROUP, LUIS, added.id(), edited);

        assertThat(result.id()).isEqualTo(added.id());
        assertThat(result.wish()).isEqualTo(edited);
        assertThat(wishlists.wishlistOf(GROUP, CARMEN, LUIS).wishes()).containsExactly(result);
    }

    @Test
    @DisplayName("another Member cannot edit or delete someone else's Wish")
    void othersCannotChangeAWish() {
        StoredWish added = wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));

        assertThatThrownBy(() -> wishlists.editWish(GROUP, CARMEN, added.id(), wish("Carbón", Priority.HIGH)))
                .isInstanceOf(NotYourWishException.class)
                .hasFieldOrPropertyWithValue("code", "wish-not-yours");
        assertThatThrownBy(() -> wishlists.deleteWish(GROUP, CARMEN, added.id()))
                .isInstanceOf(NotYourWishException.class);
        assertThat(stored.all()).containsExactly(added);
    }

    @Test
    @DisplayName("the owner deletes a Wish; a Wish that is gone, or in another Group, is not found")
    void ownerDeletesAWish() {
        StoredWish added = wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));

        wishlists.deleteWish(GROUP, LUIS, added.id());

        assertThat(stored.all()).isEmpty();
        assertThatThrownBy(() -> wishlists.deleteWish(GROUP, LUIS, added.id()))
                .isInstanceOf(WishNotFoundException.class);
        StoredWish elsewhere = wishlists.addWish(OTHER_GROUP, LUIS, wish("Bicicleta", Priority.HIGH));
        assertThatThrownBy(() -> wishlists.editWish(GROUP, LUIS, elsewhere.id(), wish("Moto", Priority.HIGH)))
                .isInstanceOf(WishNotFoundException.class);
    }

    @Test
    @DisplayName("when a membership ends, that Member's Wishes in that Group go, and nobody else's")
    void membershipEndedDeletesTheMembersWishes() {
        wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));
        StoredWish carmens = wishlists.addWish(GROUP, CARMEN, wish("Plantas", Priority.MEDIUM));
        StoredWish luisElsewhere = wishlists.addWish(OTHER_GROUP, LUIS, wish("Bicicleta", Priority.HIGH));

        wishlists.on(new MembershipEnded(GROUP, LUIS));

        assertThat(stored.all()).containsExactlyInAnyOrder(carmens, luisElsewhere);
    }

    @Test
    @DisplayName("when a Group is deleted, every Wish in it goes, and other Groups keep theirs")
    void groupDeletedDeletesItsWishes() {
        wishlists.addWish(GROUP, LUIS, wish("Bufanda", Priority.MEDIUM));
        wishlists.addWish(GROUP, CARMEN, wish("Plantas", Priority.MEDIUM));
        StoredWish luisElsewhere = wishlists.addWish(OTHER_GROUP, LUIS, wish("Bicicleta", Priority.HIGH));

        wishlists.on(new GroupDeleted(GROUP));

        assertThat(stored.all()).containsExactly(luisElsewhere);
    }

    // --- fakes and helpers ---

    private static Wish wish(String title, Priority priority) {
        return new Wish(title, null, null, null, priority);
    }

    private static GroupMember member(UUID id, String displayName) {
        return new GroupMember(new MemberId(id), displayName);
    }

    private static final class FakeGroupMembers implements GroupMembers {

        private final Map<UUID, List<GroupMember>> groups = new HashMap<>();

        void put(UUID groupId, List<GroupMember> members) {
            groups.put(groupId, members);
        }

        @Override
        public Optional<List<GroupMember>> of(UUID groupId, UUID viewer) {
            return Optional.ofNullable(groups.get(groupId))
                    .filter(members ->
                            members.stream().anyMatch(m -> m.id().value().equals(viewer)));
        }
    }

    private static final class InMemoryWishes implements Wishes {

        private record Row(UUID groupId, StoredWish wish) {}

        private final List<Row> rows = new ArrayList<>();

        List<StoredWish> all() {
            return rows.stream().map(Row::wish).toList();
        }

        @Override
        public List<StoredWish> of(UUID groupId, MemberId owner) {
            return rows.stream()
                    .filter(row ->
                            row.groupId().equals(groupId) && row.wish().owner().equals(owner))
                    .map(Row::wish)
                    .toList();
        }

        @Override
        public Optional<StoredWish> find(UUID groupId, UUID wishId) {
            return rows.stream()
                    .filter(row ->
                            row.groupId().equals(groupId) && row.wish().id().equals(wishId))
                    .map(Row::wish)
                    .findFirst();
        }

        @Override
        public StoredWish add(UUID groupId, MemberId owner, Wish wish, Instant createdAt) {
            StoredWish stored = new StoredWish(UUID.randomUUID(), owner, wish);
            rows.add(new Row(groupId, stored));
            return stored;
        }

        @Override
        public StoredWish replace(UUID groupId, StoredWish wish) {
            rows.replaceAll(row -> row.wish().id().equals(wish.id()) ? new Row(groupId, wish) : row);
            return wish;
        }

        @Override
        public void remove(UUID groupId, UUID wishId) {
            rows.removeIf(
                    row -> row.groupId().equals(groupId) && row.wish().id().equals(wishId));
        }

        @Override
        public void removeAllOf(UUID groupId, MemberId owner) {
            rows.removeIf(
                    row -> row.groupId().equals(groupId) && row.wish().owner().equals(owner));
        }

        @Override
        public void removeAllIn(UUID groupId) {
            rows.removeIf(row -> row.groupId().equals(groupId));
        }
    }
}
