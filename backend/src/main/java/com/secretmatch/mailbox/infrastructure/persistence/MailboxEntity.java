package com.secretmatch.mailbox.infrastructure.persistence;

import com.secretmatch.mailbox.domain.Mailbox;
import com.secretmatch.mailbox.domain.MailboxId;
import com.secretmatch.mailbox.domain.MemberId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** The {@code mailboxes} table. Its rows are added with a native query in {@link MailboxRepository}. */
@Entity
@Table(name = "mailboxes")
class MailboxEntity {

    @Id
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    /** {@code null} once the Giver deleted their account. */
    @Column(name = "giver_id")
    private UUID giverId;

    @Column(name = "receiver_id", nullable = false)
    private UUID receiverId;

    protected MailboxEntity() {}

    Mailbox toMailbox() {
        return new Mailbox(
                new MailboxId(id), groupId, giverId == null ? null : new MemberId(giverId), new MemberId(receiverId));
    }
}
