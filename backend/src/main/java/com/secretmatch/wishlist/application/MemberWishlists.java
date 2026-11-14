package com.secretmatch.wishlist.application;

import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.group.application.MembershipEnded;
import com.secretmatch.wishlist.domain.DontListEntry;
import com.secretmatch.wishlist.domain.DontListEntryNotFoundException;
import com.secretmatch.wishlist.domain.GroupNotFoundException;
import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.NotYourWishException;
import com.secretmatch.wishlist.domain.Preferences;
import com.secretmatch.wishlist.domain.Wish;
import com.secretmatch.wishlist.domain.WishNotFoundException;
import com.secretmatch.wishlist.domain.WishlistNotFoundException;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Each Member keeps their own Wishlist in a Group. It is private: only its owner reads it, and once the Group has a
 * Draw, so does the owner's Giver (ADR 0004). To anyone else it does not exist, and to someone outside the Group
 * neither does the Group. Nothing here records who read which Wishlist.
 */
@Service
public class MemberWishlists {

    private static final Comparator<StoredWish> HIGH_PRIORITY_FIRST =
            Comparator.comparing(stored -> stored.wish().priority());

    private final Wishes wishes;
    private final AllPreferences preferences;
    private final DontListEntries dontLists;
    private final GroupMembers groupMembers;
    private final Receivers receivers;
    private final Clock clock;

    MemberWishlists(
            Wishes wishes,
            AllPreferences preferences,
            DontListEntries dontLists,
            GroupMembers groupMembers,
            Receivers receivers,
            Clock clock) {
        this.wishes = wishes;
        this.preferences = preferences;
        this.dontLists = dontLists;
        this.groupMembers = groupMembers;
        this.receivers = receivers;
        this.clock = clock;
    }

    /**
     * A Member's Wishlist, for its owner or their Giver: high priority Wishes first, and the oldest first within a
     * priority; their Preferences; and their Don't List, oldest first.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code viewer} is not one of its Members
     * @throws WishlistNotFoundException if {@code owner} is not a Member of the Group, or {@code viewer} is neither
     *     {@code owner} nor their Giver: the two look the same, so nobody learns who gives to whom
     */
    @Transactional(readOnly = true)
    public WishlistDetails wishlistOf(UUID groupId, UUID viewer, UUID owner) {
        List<GroupMember> members = membersSeenBy(groupId, viewer);
        if (!viewer.equals(owner) && !isGiverOf(groupId, viewer, owner)) {
            throw new WishlistNotFoundException();
        }
        GroupMember member = members.stream()
                .filter(candidate -> candidate.id().value().equals(owner))
                .findFirst()
                .orElseThrow(WishlistNotFoundException::new);
        List<StoredWish> ordered = wishes.of(groupId, member.id()).stream()
                .sorted(HIGH_PRIORITY_FIRST)
                .toList();
        return new WishlistDetails(
                new WishlistDetails.Owner(owner, member.displayName(), owner.equals(viewer)),
                ordered,
                preferences.of(groupId, member.id()),
                dontLists.of(groupId, member.id()));
    }

    /**
     * Adds a Wish to {@code owner}'s own Wishlist in the Group.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     */
    @Transactional
    public StoredWish addWish(UUID groupId, UUID owner, Wish wish) {
        membersSeenBy(groupId, owner);
        return wishes.add(groupId, new MemberId(owner), wish, clock.instant());
    }

    /**
     * Replaces what one of {@code owner}'s Wishes says.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     * @throws WishNotFoundException if the Group has no such Wish
     * @throws NotYourWishException if the Wish is on someone else's Wishlist
     */
    @Transactional
    public StoredWish editWish(UUID groupId, UUID owner, UUID wishId, Wish wish) {
        StoredWish current = ownWish(groupId, owner, wishId);
        return wishes.replace(groupId, new StoredWish(current.id(), current.owner(), wish));
    }

    /**
     * Deletes one of {@code owner}'s Wishes.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     * @throws WishNotFoundException if the Group has no such Wish
     * @throws NotYourWishException if the Wish is on someone else's Wishlist
     */
    @Transactional
    public void deleteWish(UUID groupId, UUID owner, UUID wishId) {
        ownWish(groupId, owner, wishId);
        wishes.remove(groupId, wishId);
    }

    /**
     * Writes {@code owner}'s own Preferences in the Group, replacing what they said before; {@link Preferences#NONE}
     * clears them.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     */
    @Transactional
    public Preferences editPreferences(UUID groupId, UUID owner, Preferences written) {
        membersSeenBy(groupId, owner);
        preferences.save(groupId, new MemberId(owner), written);
        return written;
    }

    /**
     * Adds an entry to {@code owner}'s own Don't List in the Group.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     */
    @Transactional
    public StoredDontListEntry addDontListEntry(UUID groupId, UUID owner, DontListEntry entry) {
        membersSeenBy(groupId, owner);
        return dontLists.add(groupId, new MemberId(owner), entry, clock.instant());
    }

    /**
     * Removes an entry from {@code owner}'s own Don't List.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code owner} is not one of its Members
     * @throws DontListEntryNotFoundException if the Group has no such entry, or it is on someone else's Don't
     *     List: the two look the same, so nobody but its owner can tell it exists
     */
    @Transactional
    public void deleteDontListEntry(UUID groupId, UUID owner, UUID entryId) {
        membersSeenBy(groupId, owner);
        dontLists
                .find(groupId, entryId)
                .filter(entry -> entry.owner().equals(new MemberId(owner)))
                .orElseThrow(DontListEntryNotFoundException::new);
        dontLists.remove(groupId, entryId);
    }

    /** A Member's Wishlist goes with their membership, in the same transaction. */
    @EventListener
    void on(MembershipEnded event) {
        MemberId member = new MemberId(event.memberId());
        wishes.removeAllOf(event.groupId(), member);
        preferences.removeAllOf(event.groupId(), member);
        dontLists.removeAllOf(event.groupId(), member);
    }

    /** A deleted Group's Wishlists go with it, in the same transaction, before its Members' rows. */
    @EventListener
    void on(GroupDeleted event) {
        wishes.removeAllIn(event.groupId());
        preferences.removeAllIn(event.groupId());
        dontLists.removeAllIn(event.groupId());
    }

    private boolean isGiverOf(UUID groupId, UUID viewer, UUID owner) {
        return receivers
                .receiverOf(groupId, viewer)
                .filter(receiver -> receiver.value().equals(owner))
                .isPresent();
    }

    private List<GroupMember> membersSeenBy(UUID groupId, UUID viewer) {
        return groupMembers.of(groupId, viewer).orElseThrow(GroupNotFoundException::new);
    }

    private StoredWish ownWish(UUID groupId, UUID owner, UUID wishId) {
        membersSeenBy(groupId, owner);
        StoredWish stored = wishes.find(groupId, wishId).orElseThrow(WishNotFoundException::new);
        if (!stored.owner().equals(new MemberId(owner))) {
            throw new NotYourWishException();
        }
        return stored;
    }
}
