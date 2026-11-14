package com.secretmatch.wishlist.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A Member tried to change their Wishlist in a finished Group: its Exchange Date is over, so it is read-only.
 * Same {@code code} as the Groups module's error, because it is the same rule.
 */
public class GroupFinishedException extends DomainException {

    public GroupFinishedException() {
        super("group-finished", "This Group is finished: its Exchange Date is over.");
    }
}
