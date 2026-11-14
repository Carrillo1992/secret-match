package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.Mailbox;
import com.secretmatch.mailbox.domain.MailboxId;
import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.mailbox.domain.MessageText;
import com.secretmatch.mailbox.domain.UserId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port to where the Mailboxes and their Messages are stored. */
public interface Mailboxes {

    /**
     * The Mailbox of this Assignment, created the first time it is asked for. Safe when it is opened twice at once:
     * both get the same Mailbox.
     */
    Mailbox open(UUID groupId, MemberId giver, MemberId receiver);

    Optional<Mailbox> find(MailboxId id);

    /** The Mailbox's Messages, oldest first. */
    List<StoredMessage> messagesIn(MailboxId id);

    StoredMessage addMessage(MailboxId id, MemberId author, MessageText text, Instant sentAt);

    /**
     * The Mailbox in the Group whose Receiver is {@code receiver} and whose Giver deleted their account; empty if
     * there is none.
     */
    Optional<Mailbox> withDeletedGiver(UUID groupId, MemberId receiver);

    /** Deletes every Mailbox in the Group, with its Messages. */
    void removeAllIn(UUID groupId);

    /** Deletes every Mailbox, in any Group, this User is the Receiver of, with its Messages. */
    void removeAllReceivedBy(UserId user);

    /**
     * Keeps every Mailbox, in any Group, this User is the Giver of, and its Messages, but forgets that they are its
     * Giver and wrote those Messages.
     */
    void forgetGiver(UserId user);
}
