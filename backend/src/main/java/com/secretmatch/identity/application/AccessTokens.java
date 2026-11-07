package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.UserId;

/** Port to the issuer of access tokens (JWT). Checking them is the web layer's job. */
public interface AccessTokens {

    /** A token for this User, issued in this Session of theirs. */
    AccessToken issueFor(UserId userId, SessionId sessionId);
}
