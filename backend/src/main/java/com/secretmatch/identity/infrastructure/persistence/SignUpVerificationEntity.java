package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.SignUpId;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.TokenHash;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sign_up_verifications")
class SignUpVerificationEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    protected SignUpVerificationEntity() {}

    static SignUpVerificationEntity from(SignUpVerification signUp) {
        SignUpVerificationEntity entity = new SignUpVerificationEntity();
        entity.id = signUp.id().value();
        entity.email = signUp.email().value();
        entity.displayName = signUp.displayName().value();
        entity.passwordHash = signUp.passwordHash().value();
        entity.tokenHash = signUp.tokenHash().value();
        entity.expiresAt = signUp.expiresAt();
        entity.usedAt = signUp.usedAt().orElse(null);
        return entity;
    }

    SignUpVerification toDomain() {
        return new SignUpVerification(
                new SignUpId(id),
                new EmailAddress(email),
                new DisplayName(displayName),
                new PasswordHash(passwordHash),
                new TokenHash(tokenHash),
                expiresAt,
                usedAt);
    }
}
