package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/** The Admin tried to change the Exclusions of a drawn Group: after the Draw they are frozen (ADR 0001). */
public class GroupDrawnException extends DomainException {

    public GroupDrawnException() {
        super("group-drawn", "This Group's Draw is made: its Exclusions can no longer change.");
    }
}
