package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/** Someone tried to change a finished Group: its Exchange Date is over, so it is read-only. */
public class GroupFinishedException extends DomainException {

    public GroupFinishedException() {
        super("group-finished", "This Group is finished: its Exchange Date is over.");
    }
}
