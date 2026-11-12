package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A Member who is not the Admin tried to run the Draw. Same {@code code} as the Groups module's error, because it
 * is the same rule.
 */
public class AdminOnlyException extends DomainException {

    public AdminOnlyException() {
        super("admin-only", "Only the Admin of the Group can do this.");
    }
}
