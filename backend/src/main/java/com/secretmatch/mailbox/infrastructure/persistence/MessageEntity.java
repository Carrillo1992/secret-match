package com.secretmatch.mailbox.infrastructure.persistence;

import com.secretmatch.mailbox.application.StoredMessage;
import com.secretmatch.mailbox.domain.MailboxId;
import com.secretmatch.mailbox.domain.MemberId;
import com.secretmatch.mailbox.domain.MessageText;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The {@code messages} table. */
@Entity
@Table(name = "messages")
class MessageEntity {

    @Id
    private UUID id;

    @Column(name = "mailbox_id", nullable = false)
    private UUID mailboxId;

    /** {@code null} once a Giver who deleted their account wrote it. */
    @Column(name = "author_id")
    private UUID authorId;

    @Column(nullable = false)
    private String text;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    protected MessageEntity() {}

    static MessageEntity newMessage(MailboxId mailbox, MemberId author, MessageText text, Instant sentAt) {
        MessageEntity entity = new MessageEntity();
        entity.id = UUID.randomUUID();
        entity.mailboxId = mailbox.value();
        entity.authorId = author.value();
        entity.text = text.value();
        entity.sentAt = sentAt;
        return entity;
    }

    StoredMessage toStored() {
        return new StoredMessage(authorId == null ? null : new MemberId(authorId), new MessageText(text), sentAt);
    }
}
