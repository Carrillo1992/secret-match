package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.domain.EmailVerification;
import com.secretmatch.identity.domain.UserId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_verifications")
class EmailVerificationEntity {

    @Id
    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    protected EmailVerificationEntity() {}

    static EmailVerificationEntity from(EmailVerification verification) {
        EmailVerificationEntity entity = new EmailVerificationEntity();
        entity.tokenHash = verification.tokenHash();
        entity.userId = verification.userId().value();
        entity.expiresAt = verification.expiresAt();
        entity.usedAt = verification.usedAt().orElse(null);
        return entity;
    }

    EmailVerification toDomain() {
        return new EmailVerification(tokenHash, new UserId(userId), expiresAt, usedAt);
    }
}
