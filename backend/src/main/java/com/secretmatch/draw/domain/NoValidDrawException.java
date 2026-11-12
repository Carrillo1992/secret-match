package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * The Group's Exclusions leave no valid Draw. Deliberately generic: it never says which Exclusion is to blame
 * (ADR 0001).
 */
public class NoValidDrawException extends DomainException {

    public NoValidDrawException() {
        super("no-valid-draw", "No Draw is possible with the current Exclusions. Remove some and try again.");
    }
}
