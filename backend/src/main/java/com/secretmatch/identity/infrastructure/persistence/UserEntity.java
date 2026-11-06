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

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected UserEntity() {}

    static UserEntity from(User user) {
        UserEntity entity = new UserEntity();
        entity.id = user.id().value();
        entity.email = user.email().value();
        entity.displayName = user.displayName().value();
        entity.passwordHash = user.passwordHash().map(PasswordHash::value).orElse(null);
        entity.emailVerifiedAt = user.emailVerifiedAt().orElse(null);
        entity.createdAt = user.createdAt();
        return entity;
    }

    User toDomain() {
        return new User(
                new UserId(id),
                new EmailAddress(email),
                new DisplayName(displayName),
                passwordHash == null ? null : new PasswordHash(passwordHash),
                emailVerifiedAt,
                createdAt);
    }
}
