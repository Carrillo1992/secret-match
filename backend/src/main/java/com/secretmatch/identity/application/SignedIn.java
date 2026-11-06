package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.RefreshTokenValue;

/** A signed-in session: the access token for the SPA, the refresh token for its cookie. */
public record SignedIn(AccessToken accessToken, RefreshTokenValue refreshToken) {

    @Override
    public String toString() {
        return "SignedIn[redacted]";
    }
}
