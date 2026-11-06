package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The {@code users} table. New rows go in through {@link UserRepository#insertIfEmailFree}. */
@Entity
@Table(name = "users")
class UserEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected UserEntity() {}

    User toDomain() {
        return new User(
                new UserId(id),
                new EmailAddress(email),
                new DisplayName(displayName),
                passwordHash == null ? null : new PasswordHash(passwordHash),
                createdAt);
    }
}
