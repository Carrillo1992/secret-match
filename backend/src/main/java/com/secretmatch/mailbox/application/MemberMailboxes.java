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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
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
     * before the Draw. Each is created the first time it is listed. If their Giver deleted their account, the
     * Member keeps the Mailbox they had with them, which looks just as before.
     *
     * @throws GroupNotFoundException if there is no such Group or {@code member} is not one of its Members
     */
    @Transactional
    public List<MyMailbox> mailboxesOf(UUID groupId, UUID member) {
        List<GroupMember> members = groupMembers.of(groupId, member).orElseThrow(GroupNotFoundException::new);
        MemberId me = new MemberId(member);
        Optional<MemberId> receiver = assignments.receiverOf(groupId, me);
        Optional<MemberId> giver = assignments.giverOf(groupId, me);
        Map<Pair, Mailbox> opened = openInGlobalOrder(
                groupId,
                Stream.concat(
                                receiver.map(theirs -> new Pair(me, theirs)).stream(),
                                giver.map(theirs -> new Pair(theirs, me)).stream())
                        .toList());
        List<MyMailbox> mine = new ArrayList<>(2);
        receiver.ifPresent(theirs -> mine.add(
                new MyMailbox.WithMyReceiver(opened.get(new Pair(me, theirs)).id(), displayNameOf(theirs, members))));
        giver.map(theirs -> opened.get(new Pair(theirs, me)))
                .or(() -> mailboxes.withGoneGiver(groupId, me))
                .ifPresent(mailbox -> mine.add(new MyMailbox.WithMyGiver(mailbox.id())));
        return List.copyOf(mine);
    }

    /**
     * The Mailbox's Messages, oldest first.
     *
     * @throws MailboxNotFoundException if there is no such Mailbox, {@code member} is not its Giver or Receiver, or
     *     it no longer belongs to the Group's Draw
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

    /**
     * A deleted User's Mailboxes with their Giver go with them, in the same transaction. Those with their Receiver
     * stay, with their Messages, but no longer say who wrote them: if they disappeared just as the User leaves the
     * Group, the Receiver would learn who their Giver was (ADR 0001).
     */
    @EventListener
    void on(UserDeleted event) {
        MemberId user = new MemberId(event.userId());
        mailboxes.removeAllReceivedBy(user);
        mailboxes.forgetGiver(user);
    }

    /** The Mailbox, if {@code member} is on one side of it and its Assignment is still part of the Group's Draw. */
    private Mailbox openTo(UUID mailboxId, UUID member) {
        Mailbox mailbox = mailboxes.find(new MailboxId(mailboxId)).orElseThrow(MailboxNotFoundException::new);
        if (mailbox.sideOf(new MemberId(member)).isEmpty() || !isCurrent(mailbox)) {
            throw new MailboxNotFoundException();
        }
        return mailbox;
    }

    /**
     * Whether the Mailbox's Assignment is still part of the Group's Draw. One whose Giver is gone is current while
     * its Receiver has no Giver.
     */
    private boolean isCurrent(Mailbox mailbox) {
        if (mailbox.giverIsGone()) {
            return assignments
                    .giverOf(mailbox.groupId().value(), mailbox.receiver())
                    .isEmpty();
        }
        return assignments
                .receiverOf(mailbox.groupId().value(), mailbox.giver())
                .filter(mailbox.receiver()::equals)
                .isPresent();
    }

    /**
     * Opens the Mailboxes in one order shared by every request, so two Members listing theirs at once never wait
     * for each other's rows in opposite orders (a deadlock).
     */
    private Map<Pair, Mailbox> openInGlobalOrder(UUID groupId, List<Pair> pairs) {
        Map<Pair, Mailbox> opened = new HashMap<>();
        pairs.stream()
                .sorted(Pair.GLOBAL_ORDER)
                .forEach(pair -> opened.put(pair, mailboxes.open(groupId, pair.giver(), pair.receiver())));
        return opened;
    }

    private record Pair(MemberId giver, MemberId receiver) {

        static final Comparator<Pair> GLOBAL_ORDER = Comparator.<Pair, UUID>comparing(
                        pair -> pair.giver().value())
                .thenComparing(pair -> pair.receiver().value());
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
                viewer.equals(stored.author()), stored.text(), LocalDate.ofInstant(stored.sentAt(), ZoneOffset.UTC));
    }
}
