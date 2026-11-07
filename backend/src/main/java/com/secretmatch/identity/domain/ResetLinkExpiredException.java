package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class ResetLinkExpiredException extends DomainException {

    public ResetLinkExpiredException() {
        super("reset-link-expired", "This password reset link has expired.");
    }
}
