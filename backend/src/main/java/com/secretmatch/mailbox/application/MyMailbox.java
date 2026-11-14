package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MailboxId;
import java.util.Objects;

/** One of a Member's Mailboxes, as they see it. There is no way to say anything about their Giver (ADR 0001). */
public sealed interface MyMailbox {

    MailboxId id();

    /** The Mailbox with the Member's Receiver, whom they know. */
    record WithMyReceiver(MailboxId id, String receiverDisplayName) implements MyMailbox {

        public WithMyReceiver {
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(receiverDisplayName, "receiverDisplayName");
        }
    }

    /** The Mailbox with the Member's Giver, who stays anonymous: only its id. */
    record WithMyGiver(MailboxId id) implements MyMailbox {

        public WithMyGiver {
            Objects.requireNonNull(id, "id");
        }
    }
}
