package com.secretmatch.shared.domain;

/**
 * Something the caller asked for does not exist for them: either it does not exist at all, or they may not
 * know it does. The API answers both the same way, as 404, so the difference never leaks.
 */
public abstract class NotFoundException extends DomainException {

    protected NotFoundException(String code, String message) {
        super(code, message);
    }
}
