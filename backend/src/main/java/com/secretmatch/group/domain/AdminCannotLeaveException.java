package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/** The Admin tried to leave their own Group: they cannot, they can only delete it. */
public class AdminCannotLeaveException extends DomainException {

    public AdminCannotLeaveException() {
        super("admin-cannot-leave", "The Admin cannot leave their own Group; they can delete it instead.");
    }
}
