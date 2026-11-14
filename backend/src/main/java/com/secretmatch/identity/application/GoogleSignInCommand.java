package com.secretmatch.identity.application;

/**
 * A Google sign-in as the SPA sent it, not yet validated by the domain.
 *
 * @param idToken the ID token Google Identity Services gave the SPA
 * @param language the code of the Language the sign-in was made in, for the User it may create
 */
public record GoogleSignInCommand(String idToken, String language) {

    /** Leaves out the ID token. */
    @Override
    public String toString() {
        return "GoogleSignInCommand[redacted]";
    }
}
