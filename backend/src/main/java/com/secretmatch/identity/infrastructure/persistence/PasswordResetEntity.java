package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.domain.PasswordReset;
import com.secretmatch.identity.domain.TokenHash;
import com.secretmatch.identity.domain.UserId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Read through JPA; written with {@link PasswordResetRepository#upsert}. */
@Entity
@Table(name = "password_resets")
class PasswordResetEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    protected PasswordResetEntity() {}

    PasswordReset toDomain() {
        return new PasswordReset(new UserId(userId), new TokenHash(tokenHash), expiresAt, usedAt);
    }
}
