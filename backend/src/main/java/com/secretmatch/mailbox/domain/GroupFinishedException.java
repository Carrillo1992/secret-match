package com.secretmatch.mailbox.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A Member tried to write a Message in a finished Group: its Exchange Date is over, so its Mailboxes are read-only.
 * Same {@code code} as the Groups module's error, because it is the same rule.
 */
public class GroupFinishedException extends DomainException {

    public GroupFinishedException() {
        super("group-finished", "This Group is finished: its Exchange Date is over.");
    }
}
