package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.RefreshToken;
import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.TokenHash;
import java.time.Instant;
import java.util.Optional;

/**
 * Port to where refresh tokens are stored. A token found here stays locked until the transaction ends, so
 * two refreshes with the same token are handled one after the other: the second is seen as a reuse.
 */
public interface RefreshTokens {

    Optional<RefreshToken> findByTokenHash(TokenHash tokenHash);

    void save(RefreshToken token);

    /** Ends the session: none of its tokens works any more. */
    void revokeSession(SessionId sessionId, Instant now);
}
