package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * Someone tried to change what a drawn Group freezes: after the Draw nobody joins, leaves or is removed, and its
 * Time Zone stays as it is (ADR 0001).
 */
public class GroupDrawnException extends DomainException {

    public GroupDrawnException() {
        this("This Group's Draw is made: nobody can join it, leave it or be removed from it.");
    }

    private GroupDrawnException(String message) {
        super("group-drawn", message);
    }

    static GroupDrawnException timeZone() {
        return new GroupDrawnException("This Group's Draw is made: its Time Zone can no longer change.");
    }
}
