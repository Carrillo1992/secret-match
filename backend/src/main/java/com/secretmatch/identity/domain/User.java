package com.secretmatch.identity.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A person's account. A User who signed up with a password cannot use it until their email is verified,
 * so nobody can claim someone else's inbox.
 */
public final class User {

    private final UserId id;
    private final EmailAddress email;
    private final Instant createdAt;
    private DisplayName displayName;
    private PasswordHash passwordHash;
    private Instant emailVerifiedAt;

    /** Rebuilds a stored User; {@code passwordHash} and {@code emailVerifiedAt} may be {@code null}. */
    public User(
            UserId id,
            EmailAddress email,
            DisplayName displayName,
            PasswordHash passwordHash,
            Instant emailVerifiedAt,
            Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
        this.displayName = Objects.requireNonNull(displayName, "displayName");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.passwordHash = passwordHash;
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public static User signUpWithPassword(
            EmailAddress email, DisplayName displayName, PasswordHash passwordHash, Instant now) {
        return new User(UserId.newId(), email, displayName, passwordHash, null, now);
    }

    /**
     * Someone signed up again with this email before it was verified. The newest details win: only the
     * inbox owner can verify them, and an earlier sign-up by someone else must not keep its password.
     */
    public void signUpAgain(DisplayName newDisplayName, PasswordHash newPasswordHash) {
        if (isEmailVerified()) {
            throw new IllegalStateException("a verified User cannot sign up again");
        }
        this.displayName = Objects.requireNonNull(newDisplayName, "newDisplayName");
        this.passwordHash = Objects.requireNonNull(newPasswordHash, "newPasswordHash");
    }

    /**
     * @throws VerificationLinkUsedException if the email was already verified, through another link
     */
    public void verifyEmail(Instant now) {
        if (isEmailVerified()) {
            throw new VerificationLinkUsedException();
        }
        emailVerifiedAt = now;
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
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

    public Optional<Instant> emailVerifiedAt() {
        return Optional.ofNullable(emailVerifiedAt);
    }

    public Instant createdAt() {
        return createdAt;
    }
}
