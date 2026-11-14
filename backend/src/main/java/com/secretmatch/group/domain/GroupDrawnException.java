package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/** Someone tried to change who is in a drawn Group: after the Draw its membership is frozen (ADR 0001). */
public class GroupDrawnException extends DomainException {

    public GroupDrawnException() {
        super("group-drawn", "This Group's Draw is made: nobody can join it, leave it or be removed from it.");
    }
}
