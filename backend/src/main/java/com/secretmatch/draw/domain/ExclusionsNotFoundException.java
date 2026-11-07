package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.NotFoundException;

/**
 * No such Group, or the User is not its Admin. A regular Member is told the same as a stranger, so they learn
 * nothing about the Group's Exclusions (ADR 0001).
 */
public class ExclusionsNotFoundException extends NotFoundException {

    public ExclusionsNotFoundException() {
        super("exclusions-not-found", "There are no Exclusions to see here.");
    }
}
