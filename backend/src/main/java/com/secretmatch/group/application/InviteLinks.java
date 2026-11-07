package com.secretmatch.group.application;

import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.InviteCode;
import com.secretmatch.group.domain.InviteLinkInvalidException;
import com.secretmatch.group.domain.MemberId;
import com.secretmatch.identity.application.UserDirectory;
import com.secretmatch.notification.application.EmailRequested;
import java.time.Clock;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Joining a Group through its Invite Link. */
@Service
public class InviteLinks {

    private final Groups groups;
    private final UserDirectory users;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    InviteLinks(Groups groups, UserDirectory users, ApplicationEventPublisher events, Clock clock) {
        this.groups = groups;
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    /**
     * Makes the User a Member of the Group whose Invite Link has this code, and emails its Admin. A User who
     * is a Member already just gets the Group back, and no email is sent.
     *
     * @return the id of the Group
     * @throws InviteLinkInvalidException if no Group's current Invite Link has this code
     * @throws com.secretmatch.group.domain.GroupFinishedException if the Group is finished
     */
    @Transactional
    public GroupId join(String inviteCode, MemberId user) {
        Group group = InviteCode.parse(inviteCode)
                .flatMap(groups::findByInviteCode)
                .orElseThrow(InviteLinkInvalidException::new);
        if (group.hasMember(user)) {
            return group.id();
        }
        group.authoriseJoin(clock.instant());
        if (groups.addMember(group.id(), user, clock.instant())) {
            emailAdmin(group, user);
        }
        return group.id();
    }

    /** Catalogue email 2: "a Member joined", to the Admin. */
    private void emailAdmin(Group group, MemberId newMember) {
        String name = users.displayNamesOf(List.of(newMember.value())).get(newMember.value());
        String admin = users.emailOf(group.admin().value())
                .orElseThrow(() -> new IllegalStateException("a Group's Admin has no User"));
        String groupName = group.name().value();
        events.publishEvent(new EmailRequested(
                admin,
                "%s se ha unido a «%s»".formatted(name, groupName),
                """
                %s se ha unido a tu grupo «%s» con el enlace de invitación.

                Ya sois %d en el grupo.""".formatted(name, groupName, group.members().size() + 1),
                "/groups/" + group.id().value()));
    }
}
