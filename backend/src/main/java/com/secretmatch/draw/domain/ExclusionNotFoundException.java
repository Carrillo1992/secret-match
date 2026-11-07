package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** The Group has no Exclusion with that id: it never had one, or it was deleted. */
public class ExclusionNotFoundException extends NotFoundException {

    public ExclusionNotFoundException() {
        super("exclusion-not-found", "The Exclusion does not exist.");
    }
}
