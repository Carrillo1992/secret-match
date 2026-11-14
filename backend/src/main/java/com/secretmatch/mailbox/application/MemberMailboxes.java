package com.secretmatch.mailbox.application;

import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.identity.application.UserDeleted;
import com.secretmatch.mailbox.domain.GroupNotFoundException;
import com.secretmatch.mailbox.domain.Mailbox;
import com.secretmatch.mailbox.domain.MailboxId;
import com.secretmatch.mailbox.domain.MailboxNotFoundException;
import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.mailbox.domain.MessageText;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Once a Group is drawn, each Member has two Mailboxes: one with their Receiver and one with their Giver. Only the
 * two Members of the Assignment read or write a Mailbox; to anyone else, the Admin included, it does not exist. The
 * Giver is never named to the Receiver, and nothing here logs (ADR 0001).
 */
@Service
public class MemberMailboxes {

    private final Mailboxes mailboxes;
    private final GroupMembers groupMembers;
    private final Assignments assignments;
    private final Clock clock;

    MemberMailboxes(Mailboxes mailboxes, GroupMembers groupMembers, Assignments assignments, Clock clock) {
        this.mailboxes = mailboxes;
        this.groupMembers = groupMembers;
        this.assignments = assignments;
        this.clock = clock;
    }

    /**
     * The Member's Mailboxes in the Group: the one with their Receiver first, then the one with their Giver. None
     * before the Draw. Each is created the first time it is listed.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code member} is not one of its Members
     */
    @Transactional
    public List<MyMailbox> mailboxesOf(UUID groupId, UUID member) {
        List<GroupMember> members = groupMembers.of(groupId, member).orElseThrow(GroupNotFoundException::new);
        MemberId me = new MemberId(member);
        List<MyMailbox> mine = new ArrayList<>(2);
        assignments
                .receiverOf(groupId, me)
                .ifPresent(receiver -> mine.add(new MyMailbox.WithMyReceiver(
                        mailboxes.open(groupId, me, receiver).id(), displayNameOf(receiver, members))));
        assignments
                .giverOf(groupId, me)
                .ifPresent(giver -> mine.add(new MyMailbox.WithMyGiver(
                        mailboxes.open(groupId, giver, me).id())));
        return List.copyOf(mine);
    }

    /**
     * The Mailbox's Messages, oldest first.
     *
     * @throws MailboxNotFoundException if there is no such Mailbox, or {@code member} is not its Giver or Receiver
     */
    @Transactional(readOnly = true)
    public List<MailboxMessage> messagesIn(UUID mailboxId, UUID member) {
        Mailbox mailbox = openTo(mailboxId, member);
        MemberId me = new MemberId(member);
        return mailboxes.messagesIn(mailbox.id()).stream()
                .map(stored -> seenBy(me, stored))
                .toList();
    }

    /**
     * Sends a Message to the other side of the Mailbox.
     *
     * @throws MailboxNotFoundException if there is no such Mailbox, or {@code author} is not its Giver or Receiver;
     *     checked before the text, so someone outside learns nothing from an invalid Message either
     * @throws com.secretmatch.mailbox.domain.InvalidMessageException if the text is empty, blank or too long
     */
    @Transactional
    public MailboxMessage send(UUID mailboxId, UUID author, String text) {
        Mailbox mailbox = openTo(mailboxId, author);
        MemberId me = new MemberId(author);
        StoredMessage sent = mailboxes.addMessage(mailbox.id(), me, new MessageText(text), clock.instant());
        return seenBy(me, sent);
    }

    /** A deleted Group's Mailboxes go with it, in the same transaction, before its Members' rows. */
    @EventListener
    void on(GroupDeleted event) {
        mailboxes.removeAllIn(event.groupId());
    }

    /** A deleted User's Mailboxes go with them, on both sides, in the same transaction. */
    @EventListener
    void on(UserDeleted event) {
        mailboxes.removeAllOf(new MemberId(event.userId()));
    }

    /** The Mailbox, if {@code member} is on one side of it and its Assignment is still part of the Group's Draw. */
    private Mailbox openTo(UUID mailboxId, UUID member) {
        Mailbox mailbox = mailboxes.find(new MailboxId(mailboxId)).orElseThrow(MailboxNotFoundException::new);
        if (mailbox.sideOf(new MemberId(member)).isEmpty() || !isCurrent(mailbox)) {
            throw new MailboxNotFoundException();
        }
        return mailbox;
    }

    private boolean isCurrent(Mailbox mailbox) {
        return assignments
                .receiverOf(mailbox.groupId(), mailbox.giver())
                .filter(mailbox.receiver()::equals)
                .isPresent();
    }

    private static String displayNameOf(MemberId member, List<GroupMember> members) {
        return members.stream()
                .filter(candidate -> candidate.id().equals(member))
                .map(GroupMember::displayName)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("a Receiver who is not in the Group"));
    }

    private static MailboxMessage seenBy(MemberId viewer, StoredMessage stored) {
        return new MailboxMessage(
                stored.author().equals(viewer), stored.text(), LocalDate.ofInstant(stored.sentAt(), ZoneOffset.UTC));
    }
}
