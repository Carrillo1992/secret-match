package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class ResetLinkUsedException extends DomainException {

    public ResetLinkUsedException() {
        super("reset-link-used", "This password reset link has already been used.");
    }
}
