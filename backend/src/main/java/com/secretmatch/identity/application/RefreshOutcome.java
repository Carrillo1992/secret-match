package com.secretmatch.identity.application;

/** What a refresh hands back: a rotated session, or just an access token when the cookie was rotated a moment ago. */
public sealed interface RefreshOutcome {

    AccessToken accessToken();

    /** The token was swapped for a new one, which replaces it in the cookie. */
    record Rotated(SignedIn session) implements RefreshOutcome {

        @Override
        public AccessToken accessToken() {
            return session.accessToken();
        }
    }

    /**
     * The token had been swapped a moment ago by a concurrent refresh, whose response already set the new
     * cookie: the cookie stays as it is.
     */
    record AlreadyRotated(AccessToken accessToken) implements RefreshOutcome {}
}
