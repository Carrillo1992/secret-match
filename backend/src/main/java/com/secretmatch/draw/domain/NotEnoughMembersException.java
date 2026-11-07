package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Draw was attempted in a Group with fewer than 4 Members (ADR 0001). */
public class NotEnoughMembersException extends DomainException {

    public NotEnoughMembersException() {
        super("not-enough-members", "A Draw needs at least 4 Members.");
    }
}
