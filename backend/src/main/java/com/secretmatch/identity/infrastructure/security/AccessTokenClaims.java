package com.secretmatch.identity.infrastructure.security;

import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.UserId;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

/** What an access token says about its caller: the User (subject) and the Session it was issued in. */
public final class AccessTokenClaims {

    /** The Session the token was issued in. Every token carries it: the decoder refuses one without it. */
    static final String SESSION = "sid";

    private AccessTokenClaims() {}

    public static UserId userId(Jwt accessToken) {
        return new UserId(UUID.fromString(accessToken.getSubject()));
    }

    public static SessionId sessionId(Jwt accessToken) {
        return new SessionId(UUID.fromString(accessToken.getClaimAsString(SESSION)));
    }
}
