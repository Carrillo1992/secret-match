package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.domain.RefreshToken;
import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.TokenHash;
import com.secretmatch.identity.domain.UserId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity {

    @Id
    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected RefreshTokenEntity() {}

    static RefreshTokenEntity from(RefreshToken token) {
        RefreshTokenEntity entity = new RefreshTokenEntity();
        entity.tokenHash = token.tokenHash().value();
        entity.sessionId = token.sessionId().value();
        entity.userId = token.userId().value();
        entity.expiresAt = token.expiresAt();
        entity.rotatedAt = token.rotatedAt().orElse(null);
        entity.revokedAt = token.revokedAt().orElse(null);
        return entity;
    }

    RefreshToken toDomain() {
        return new RefreshToken(
                new TokenHash(tokenHash),
                new SessionId(sessionId),
                new UserId(userId),
                expiresAt,
                rotatedAt,
                revokedAt);
    }
}
