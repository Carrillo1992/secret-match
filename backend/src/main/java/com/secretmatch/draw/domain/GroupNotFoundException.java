package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.NotFoundException;

/**
 * No such Group, or the User is not one of its Members. Same {@code code} as the Groups module's error, because
 * it is the same rule.
 */
public class GroupNotFoundException extends NotFoundException {

    public GroupNotFoundException() {
        super("group-not-found", "The Group does not exist.");
    }
}
