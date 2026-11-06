package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** No such Group, or the User is not one of its Members: they are told the same, so a Group's existence does not leak. */
public class GroupNotFoundException extends NotFoundException {

    public GroupNotFoundException() {
        super("group-not-found", "The Group does not exist.");
    }
}
