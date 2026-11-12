package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/** The Admin tried to draw a Group that already has a Draw. */
public class DrawAlreadyMadeException extends DomainException {

    public DrawAlreadyMadeException() {
        super("draw-already-made", "This Group's Draw is already made.");
    }
}
