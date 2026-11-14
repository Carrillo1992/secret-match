package com.secretmatch.mailbox.domain;

import com.secretmatch.shared.domain.NotFoundException;

/**
 * No such Mailbox, or the User is not its Giver or Receiver, or it no longer belongs to the Group's Draw. All look
 * the same, so nobody learns whose Mailbox it is.
 */
public class MailboxNotFoundException extends NotFoundException {

    public MailboxNotFoundException() {
        super("mailbox-not-found", "The Mailbox does not exist.");
    }
}
