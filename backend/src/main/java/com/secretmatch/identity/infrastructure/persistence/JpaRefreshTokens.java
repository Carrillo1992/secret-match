package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.RefreshTokens;
import com.secretmatch.identity.domain.RefreshToken;
import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.TokenHash;
import com.secretmatch.identity.domain.UserId;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaRefreshTokens implements RefreshTokens {

    private final RefreshTokenRepository repository;

    JpaRefreshTokens(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<RefreshToken> findByTokenHash(TokenHash tokenHash) {
        return repository.findLockedByTokenHash(tokenHash.value()).map(RefreshTokenEntity::toDomain);
    }

    @Override
    public void save(RefreshToken token) {
        repository.save(RefreshTokenEntity.from(token));
    }

    @Override
    public void revokeSession(SessionId sessionId, Instant now) {
        repository.revokeSession(sessionId.value(), now);
    }

    @Override
    public void revokeOtherSessions(UserId userId, SessionId kept, Instant now) {
        repository.revokeOtherSessions(userId.value(), kept.value(), now);
    }
}
