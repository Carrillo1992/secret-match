package com.secretmatch.identity.domain;

/** Tells whether a typed password is the one a {@link PasswordHash} was made from. */
public interface PasswordMatcher {

    /** Whether this password, as typed, is the one the hash was made from. */
    boolean matches(String password, PasswordHash hash);
}
