package com.secretmatch.identity.application;

/** What the signed-in User may read about themselves. */
public record CurrentUser(String email, String displayName) {

    @Override
    public String toString() {
        return "CurrentUser[redacted]";
    }
}
