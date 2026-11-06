package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class VerificationLinkExpiredException extends DomainException {

    public VerificationLinkExpiredException() {
        super("verification-link-expired", "This verification link has expired.");
    }
}
