package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** The User is not a Member of the Group: they never were, or they have left or been removed. */
public class MemberNotFoundException extends NotFoundException {

    public MemberNotFoundException() {
        super("member-not-found", "The Member is not in the Group.");
    }
}
