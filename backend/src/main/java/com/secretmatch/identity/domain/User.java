package com.secretmatch.identity.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A person's account. A User only exists once their email is verified: a password sign-up waits as a
 * {@link SignUpVerification} until then.
 */
public final class User {

    private final UserId id;
    private final EmailAddress email;
    private final DisplayName displayName;
    private final PasswordHash passwordHash;
    private final Instant createdAt;

    /** Rebuilds a stored User; {@code passwordHash} is {@code null} for a User without a password. */
    public User(UserId id, EmailAddress email, DisplayName displayName, PasswordHash passwordHash, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
        this.displayName = Objects.requireNonNull(displayName, "displayName");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.passwordHash = passwordHash;
    }

    static User withPassword(
            UserId id, EmailAddress email, DisplayName displayName, PasswordHash passwordHash, Instant now) {
        return new User(id, email, displayName, Objects.requireNonNull(passwordHash, "passwordHash"), now);
    }

    public UserId id() {
        return id;
    }

    public EmailAddress email() {
        return email;
    }

    public DisplayName displayName() {
        return displayName;
    }

    public Optional<PasswordHash> passwordHash() {
        return Optional.ofNullable(passwordHash);
    }

    public Instant createdAt() {
        return createdAt;
    }
}
