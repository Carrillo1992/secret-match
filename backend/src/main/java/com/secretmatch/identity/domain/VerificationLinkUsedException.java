package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class VerificationLinkUsedException extends DomainException {

    public VerificationLinkUsedException() {
        super("verification-link-used", "This verification link has already been used.");
    }
}
