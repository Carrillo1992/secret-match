package com.secretmatch.identity.domain;

import com.secretmatch.shared.domain.DomainException;

public class VerificationLinkInvalidException extends DomainException {

    public VerificationLinkInvalidException() {
        super("verification-link-invalid", "This verification link is not valid.");
    }
}
