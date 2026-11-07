package com.secretmatch.group.application;

import com.secretmatch.group.domain.Budget;
import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.GroupNotFoundException;
import com.secretmatch.group.domain.InviteCode;
import com.secretmatch.group.domain.MemberId;
import com.secretmatch.identity.application.UserDirectory;
import com.secretmatch.notification.application.EmailRequested;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creating a Group and seeing the Groups a User is a Member of. */
@Service
public class MyGroups {

    private final Groups groups;
    private final UserDirectory users;
    private final SecureRandom random;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    MyGroups(Groups groups, UserDirectory users, SecureRandom random, Clock clock, ApplicationEventPublisher events) {
        this.groups = groups;
        this.users = users;
        this.random = random;
        this.clock = clock;
        this.events = events;
    }

    /**
     * Creates a Group whose Admin and first Member is the User creating it.
     *
     * @throws com.secretmatch.group.domain.InvalidGroupDetailsException if a detail breaks its rules
     */
    @Transactional
    public GroupDetails create(MemberId creator, CreateGroupCommand command) {
        Group group = Group.create(
                command.name(),
                command.exchangeDate(),
                command.budget(),
                creator,
                InviteCode.generate(random),
                clock.instant());
        groups.add(group);
        return detailsOf(group, creator);
    }

    /** The Groups this User is a Member of, soonest Exchange Date first. */
    @Transactional(readOnly = true)
    public List<GroupSummary> groupsOf(MemberId user) {
        return groups.findWithMember(user).stream()
                .map(group -> new GroupSummary(
                        group.id().value(),
                        group.name().value(),
                        group.exchangeDate(),
                        group.budget().map(Budget::euros).orElse(null),
                        group.members().size(),
                        group.admin().equals(user)))
                .toList();
    }

    /**
     * The Group as one of its Members sees it.
     *
     * @throws GroupNotFoundException if there is no such Group or the viewer is not one of its Members
     */
    @Transactional(readOnly = true)
    public GroupDetails group(GroupId id, MemberId viewer) {
        return detailsOf(memberView(id, viewer), viewer);
    }

    /**
     * Gives the Group a new Invite Link; the previous one stops working.
     *
     * @return the Group with its new Invite Link
     * @throws GroupNotFoundException if there is no such Group or the User is not one of its Members
     * @throws com.secretmatch.group.domain.AdminOnlyException if the User is not its Admin
     */
    @Transactional
    public GroupDetails regenerateInviteLink(GroupId id, MemberId by) {
        Group group = memberView(id, by).regenerateInviteLink(by, InviteCode.generate(random));
        groups.saveInviteCode(group);
        return detailsOf(group, by);
    }

    /**
     * Ends a membership of the Group before the Draw: {@code by} leaves when {@code member} is themselves, or
     * the Admin removes another Member.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code by} is not one of its Members
     * @throws com.secretmatch.group.domain.MemberNotFoundException if {@code member} is not one of its Members
     * @throws com.secretmatch.group.domain.AdminCannotLeaveException if the Admin tries to leave
     * @throws com.secretmatch.group.domain.AdminOnlyException if {@code by} removes someone else and is not the
     *     Admin
     */
    @Transactional
    public void removeMember(GroupId id, MemberId by, MemberId member) {
        Group group = memberView(id, by);
        group.removeMember(by, member);
        if (!groups.removeMember(group.id(), member)) {
            // Removed at the same moment by another request, which did the rest.
            return;
        }
        events.publishEvent(new MembershipEnded(group.id().value(), member.value()));
        if (!by.equals(member)) {
            emailRemovedMember(group, member);
        }
    }

    /** Catalogue email 6: "you were removed", to the removed Member. */
    private void emailRemovedMember(Group group, MemberId removed) {
        String admin = users.displayNamesOf(List.of(group.admin().value()))
                .get(group.admin().value());
        String to = users.emailOf(removed.value()).orElseThrow(() -> new IllegalStateException("a Member has no User"));
        String groupName = group.name().value();
        events.publishEvent(new EmailRequested(
                to, "Ya no estás en «%s»".formatted(groupName), """
                %s, que administra el grupo «%s», te ha quitado del grupo.

                Si crees que es un error, habla con %s.""".formatted(admin, groupName, admin), "/home"));
    }

    /** The Group, only if the User is one of its Members. Every use case on one Group goes through here. */
    private Group memberView(GroupId id, MemberId user) {
        return groups.findById(id).filter(group -> group.hasMember(user)).orElseThrow(GroupNotFoundException::new);
    }

    private GroupDetails detailsOf(Group group, MemberId viewer) {
        Map<UUID, String> names = users.displayNamesOf(
                group.members().stream().map(MemberId::value).toList());
        return new GroupDetails(
                group.id().value(),
                group.name().value(),
                group.exchangeDate(),
                group.budget().map(Budget::euros).orElse(null),
                group.members().stream()
                        // Stable: the Admin first, the rest keep the order they joined in.
                        .sorted(Comparator.comparing(member -> !member.equals(group.admin())))
                        .map(member -> new GroupDetails.Member(
                                member.value(),
                                names.get(member.value()),
                                member.equals(group.admin()),
                                member.equals(viewer)))
                        .toList(),
                group.inviteCode().value(),
                group.admin().equals(viewer));
    }
}
