package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.GoogleSignInRejectedException;

/** Port to Google: checks the ID tokens the SPA gets from Google Identity Services. */
public interface GoogleIdTokens {

    /**
     * The identity in this ID token, once its signature, issuer, audience, expiry and verified email check
     * out.
     *
     * @throws GoogleSignInRejectedException if any of them does not
     */
    GoogleIdentity verify(String idToken);
}
