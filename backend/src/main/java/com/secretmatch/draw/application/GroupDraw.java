package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.AdminOnlyException;
import com.secretmatch.draw.domain.DrawAlreadyMadeException;
import com.secretmatch.draw.domain.DrawEngine;
import com.secretmatch.draw.domain.DrawNotFoundException;
import com.secretmatch.draw.domain.DrawResult;
import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.GroupFinishedException;
import com.secretmatch.draw.domain.GroupNotFoundException;
import com.secretmatch.draw.domain.MemberId;
import com.secretmatch.draw.domain.NoValidDrawException;
import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.identity.application.UserDirectory;
import com.secretmatch.notification.application.EmailRequested;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Admin runs a Group's Draw, and each Member sees their own Receiver. Nothing here ever reveals any other
 * Assignment, nor a Giver to their Receiver (ADR 0001); nothing here logs.
 */
@Service
public class GroupDraw {

    private final Draws draws;
    private final Exclusions exclusions;
    private final Rosters rosters;
    private final SecureRandom random;
    private final Clock clock;
    private final UserDirectory users;
    private final ApplicationEventPublisher events;

    GroupDraw(
            Draws draws,
            Exclusions exclusions,
            Rosters rosters,
            SecureRandom random,
            Clock clock,
            UserDirectory users,
            ApplicationEventPublisher events) {
        this.draws = draws;
        this.exclusions = exclusions;
        this.rosters = rosters;
        this.random = random;
        this.clock = clock;
        this.users = users;
        this.events = events;
    }

    /**
     * Draws the Group and stores every Assignment at once. Every Member is emailed once it is stored.
     *
     * @return the Admin's own Receiver
     * @throws GroupNotFoundException if there is no such Group or {@code admin} is not one of its Members
     * @throws AdminOnlyException if {@code admin} is not its Admin
     * @throws GroupFinishedException if the Group is finished
     * @throws DrawAlreadyMadeException if the Group already has a Draw
     * @throws com.secretmatch.draw.domain.NotEnoughMembersException if the Group has fewer than 4 Members
     * @throws NoValidDrawException if the Exclusions leave no valid Draw; nothing is stored
     */
    @Transactional
    public MyReceiver run(UUID groupId, UUID admin) {
        Roster roster = rosters.of(groupId, admin).orElseThrow(GroupNotFoundException::new);
        if (!roster.admin().equals(new MemberId(admin))) {
            throw new AdminOnlyException();
        }
        if (roster.finished()) {
            throw new GroupFinishedException();
        }
        if (draws.existsIn(groupId)) {
            throw new DrawAlreadyMadeException();
        }
        Set<MemberId> members = roster.members().stream().map(Roster.Member::id).collect(Collectors.toSet());
        Set<Exclusion> groupExclusions = exclusions.inGroup(groupId).stream()
                .map(StoredExclusion::exclusion)
                .collect(Collectors.toSet());
        switch (DrawEngine.draw(members, groupExclusions, random)) {
            case DrawResult.Drawn drawn -> {
                // Another request drew it between the check above and now.
                if (!draws.add(groupId, drawn.assignments(), clock.instant())) {
                    throw new DrawAlreadyMadeException();
                }
            }
            case DrawResult.NoValidDraw noValidDraw -> throw new NoValidDrawException();
        }
        emailDrawMade(groupId, roster);
        return receiverOf(groupId, roster, new MemberId(admin));
    }

    /**
     * The signed-in Member's Receiver in the Group's Draw.
     *
     * @throws DrawNotFoundException if the Group has no Draw, there is no such Group, or {@code member} is not one
     *     of its Members
     */
    @Transactional(readOnly = true)
    public MyReceiver myReceiver(UUID groupId, UUID member) {
        Roster roster = rosters.of(groupId, member).orElseThrow(DrawNotFoundException::new);
        return receiverOf(groupId, roster, new MemberId(member));
    }

    /** A deleted Group's Draw goes with it, in the same transaction, before its Members' rows. */
    @EventListener
    void on(GroupDeleted event) {
        draws.removeIn(event.groupId());
    }

    /**
     * Catalogue email 3: "the Draw is made, you can do your Reveal", to every Member. It names nobody: the Reveal
     * happens in the app.
     */
    private void emailDrawMade(UUID groupId, Roster roster) {
        String groupName = roster.groupName();
        String subject = "Ya está hecho el sorteo de «%s»".formatted(groupName);
        String message = """
                Ya está hecho el sorteo del grupo «%s».

                Entra para descubrir a quién le haces el regalo.""".formatted(groupName);
        for (Roster.Member member : roster.members()) {
            String to = users.emailOf(member.id().value())
                    .orElseThrow(() -> new IllegalStateException("a Member has no User"));
            events.publishEvent(new EmailRequested(to, subject, message, "/groups/" + groupId));
        }
    }

    private MyReceiver receiverOf(UUID groupId, Roster roster, MemberId giver) {
        MemberId receiver = draws.receiverOf(groupId, giver).orElseThrow(DrawNotFoundException::new);
        Roster.Member member = roster.member(receiver)
                .orElseThrow(() -> new IllegalStateException("a Receiver who is not in the Group"));
        return new MyReceiver(member.id().value(), member.displayName());
    }
}
