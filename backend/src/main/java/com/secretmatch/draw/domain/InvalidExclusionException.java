package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/** The Admin asked for an Exclusion that cannot exist. */
public class InvalidExclusionException extends DomainException {

    private InvalidExclusionException(String code, String message) {
        super(code, message);
    }

    public static InvalidExclusionException sameMember() {
        return new InvalidExclusionException("exclusion-same-member", "An Exclusion needs two different Members.");
    }

    public static InvalidExclusionException notAMember() {
        return new InvalidExclusionException(
                "exclusion-not-a-member", "Both Members of an Exclusion must be in the Group.");
    }
}
