package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** The Group has no Draw yet, or there is no such Group, or the User is not one of its Members. */
public class DrawNotFoundException extends NotFoundException {

    public DrawNotFoundException() {
        super("draw-not-found", "There is no Draw to see here.");
    }
}
