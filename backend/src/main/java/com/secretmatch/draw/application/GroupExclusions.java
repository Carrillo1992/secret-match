package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.ExclusionNotFoundException;
import com.secretmatch.draw.domain.ExclusionsNotFoundException;
import com.secretmatch.draw.domain.GroupDrawnException;
import com.secretmatch.draw.domain.GroupFinishedException;
import com.secretmatch.draw.domain.InvalidExclusionException;
import com.secretmatch.draw.domain.MemberId;
import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.group.application.MembershipEnded;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Admin manages a Group's Exclusions. Only the Admin sees them: to anyone else every use case here answers
 * as if there were no such Group (ADR 0001).
 */
@Service
public class GroupExclusions {

    private final Exclusions exclusions;
    private final Rosters rosters;
    private final Clock clock;

    GroupExclusions(Exclusions exclusions, Rosters rosters, Clock clock) {
        this.exclusions = exclusions;
        this.rosters = rosters;
        this.clock = clock;
    }

    /**
     * The Group's Exclusions, oldest first.
     *
     * @throws ExclusionsNotFoundException if there is no such Group or {@code admin} is not its Admin
     */
    @Transactional(readOnly = true)
    public List<ExclusionDetails> exclusionsOf(UUID groupId, UUID admin) {
        Roster roster = adminView(groupId, admin);
        return exclusions.inGroup(groupId).stream()
                .map(stored -> detailsOf(stored, roster))
                .toList();
    }

    /**
     * Sets an Exclusion between two Members of the Group. If they already have one, in either order, nothing
     * changes and that one comes back.
     *
     * @throws ExclusionsNotFoundException if there is no such Group or {@code admin} is not its Admin
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Group's Draw is made
     * @throws InvalidExclusionException if both are the same Member, or one is not a Member of the Group
     */
    @Transactional
    public ExclusionDetails exclude(UUID groupId, UUID admin, UUID oneMember, UUID otherMember) {
        Roster roster = adminChange(groupId, admin);
        MemberId one = new MemberId(oneMember);
        MemberId other = new MemberId(otherMember);
        if (one.equals(other)) {
            throw InvalidExclusionException.sameMember();
        }
        if (roster.member(one).isEmpty() || roster.member(other).isEmpty()) {
            throw InvalidExclusionException.notAMember();
        }
        StoredExclusion stored = exclusions.add(groupId, new Exclusion(one, other), clock.instant());
        return detailsOf(stored, roster);
    }

    /**
     * Deletes one of the Group's Exclusions.
     *
     * @throws ExclusionsNotFoundException if there is no such Group or {@code admin} is not its Admin
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Group's Draw is made
     * @throws ExclusionNotFoundException if the Group has no such Exclusion
     */
    @Transactional
    public void remove(UUID groupId, UUID admin, UUID exclusionId) {
        adminChange(groupId, admin);
        if (!exclusions.remove(groupId, exclusionId)) {
            throw new ExclusionNotFoundException();
        }
    }

    /** A Member's Exclusions go with their membership, in the same transaction. */
    @EventListener
    void on(MembershipEnded event) {
        exclusions.removeAllOf(event.groupId(), new MemberId(event.memberId()));
    }

    /** A deleted Group's Exclusions go with it, in the same transaction, before its Members' rows. */
    @EventListener
    void on(GroupDeleted event) {
        exclusions.removeAllIn(event.groupId());
    }

    private Roster adminView(UUID groupId, UUID admin) {
        return adminOnly(rosters.of(groupId, admin), admin);
    }

    /** Locked, so a Draw being made at the same moment either waits for this change or is seen by it. */
    private Roster adminChange(UUID groupId, UUID admin) {
        Roster roster = adminOnly(rosters.lockedOf(groupId, admin), admin);
        if (roster.finished()) {
            throw new GroupFinishedException();
        }
        if (roster.drawn()) {
            throw new GroupDrawnException();
        }
        return roster;
    }

    private static Roster adminOnly(Optional<Roster> roster, UUID admin) {
        return roster.filter(found -> found.admin().equals(new MemberId(admin)))
                .orElseThrow(ExclusionsNotFoundException::new);
    }

    private static ExclusionDetails detailsOf(StoredExclusion stored, Roster roster) {
        Exclusion exclusion = stored.exclusion();
        return new ExclusionDetails(
                stored.id(), List.of(memberOf(exclusion.first(), roster), memberOf(exclusion.second(), roster)));
    }

    private static ExclusionDetails.Member memberOf(MemberId id, Roster roster) {
        Roster.Member member = roster.member(id)
                .orElseThrow(() -> new IllegalStateException("an Exclusion of someone not in the Group"));
        return new ExclusionDetails.Member(member.id().value(), member.displayName());
    }
}
