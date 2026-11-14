package com.secretmatch.mailbox.infrastructure.persistence;

import com.secretmatch.mailbox.application.Mailboxes;
import com.secretmatch.mailbox.application.StoredMessage;
import com.secretmatch.mailbox.domain.Mailbox;
import com.secretmatch.mailbox.domain.MailboxId;
import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.mailbox.domain.MessageText;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaMailboxes implements Mailboxes {

    private final MailboxRepository mailboxes;
    private final MessageRepository messages;

    JpaMailboxes(MailboxRepository mailboxes, MessageRepository messages) {
        this.mailboxes = mailboxes;
        this.messages = messages;
    }

    @Override
    public Mailbox open(UUID groupId, MemberId giver, MemberId receiver) {
        mailboxes.addIfMissing(UUID.randomUUID(), groupId, giver.value(), receiver.value());
        return mailboxes
                .findByGroupIdAndGiverIdAndReceiverId(groupId, giver.value(), receiver.value())
                .orElseThrow(() -> new IllegalStateException("a Mailbox just opened is not there"))
                .toMailbox();
    }

    @Override
    public Optional<Mailbox> find(MailboxId id) {
        return mailboxes.findById(id.value()).map(MailboxEntity::toMailbox);
    }

    @Override
    public List<StoredMessage> messagesIn(MailboxId id) {
        return messages.findIn(id.value()).stream().map(MessageEntity::toStored).toList();
    }

    @Override
    public StoredMessage addMessage(MailboxId id, MemberId author, MessageText text, Instant sentAt) {
        return messages.save(MessageEntity.newMessage(id, author, text, sentAt)).toStored();
    }

    @Override
    public void removeAllIn(UUID groupId) {
        mailboxes.removeAllIn(groupId);
    }

    @Override
    public void removeAllOf(MemberId user) {
        mailboxes.removeAllOf(user.value());
    }
}
