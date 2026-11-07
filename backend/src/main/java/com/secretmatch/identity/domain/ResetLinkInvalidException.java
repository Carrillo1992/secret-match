package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class ResetLinkInvalidException extends DomainException {

    public ResetLinkInvalidException() {
        super("reset-link-invalid", "This password reset link is not valid.");
    }
}
