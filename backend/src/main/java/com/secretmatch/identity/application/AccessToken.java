package com.secretmatch.identity.application;

import java.time.Instant;

/** A signed, short-lived token that proves who the caller is, sent as {@code Authorization: Bearer}. */
public record AccessToken(String value, Instant expiresAt) {

    @Override
    public String toString() {
        return "AccessToken[redacted]";
    }
}
