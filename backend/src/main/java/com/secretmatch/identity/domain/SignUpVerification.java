package com.secretmatch.identity.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * One password sign-up waiting for its owner to open the link emailed to them. No User exists until then,
 * and opening the link creates the User with the details of this sign-up only, so a later sign-up with the
 * same email by someone else can never change them.
 */
public final class SignUpVerification {

    /** How long a link works after it was sent. */
    public static final Duration VALIDITY = Duration.ofHours(24);

    private final SignUpId id;
    private final EmailAddress email;
    private final DisplayName displayName;
    private final PasswordHash passwordHash;
    private TokenHash tokenHash;
    private Instant expiresAt;
    private Instant usedAt;

    /** Rebuilds a stored sign-up; {@code usedAt} is {@code null} until its link is opened. */
    public SignUpVerification(
            SignUpId id,
            EmailAddress email,
            DisplayName displayName,
            PasswordHash passwordHash,
            TokenHash tokenHash,
            Instant expiresAt,
            Instant usedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
        this.displayName = Objects.requireNonNull(displayName, "displayName");
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.usedAt = usedAt;
    }

    public static SignUpVerification start(
            EmailAddress email, DisplayName displayName, PasswordHash passwordHash, EmailLinkToken token, Instant now) {
        return new SignUpVerification(
                SignUpId.newId(), email, displayName, passwordHash, token.hash(), now.plus(VALIDITY), null);
    }

    /**
     * Spends the link and creates the User it signs up.
     *
     * @throws VerificationLinkUsedException if the link was already opened
     * @throws VerificationLinkExpiredException if its 24 hours are over
     */
    public User verify(Instant now) {
        if (isUsed()) {
            throw new VerificationLinkUsedException();
        }
        if (!now.isBefore(expiresAt)) {
            throw new VerificationLinkExpiredException();
        }
        usedAt = now;
        return User.withPassword(UserId.newId(), email, displayName, passwordHash, now);
    }

    /** Replaces the link with a new one that works for another 24 hours; the old one stops working. */
    public void reissue(EmailLinkToken token, Instant now) {
        if (isUsed()) {
            throw new IllegalStateException("a verified sign-up needs no new link");
        }
        tokenHash = token.hash();
        expiresAt = now.plus(VALIDITY);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public SignUpId id() {
        return id;
    }

    public EmailAddress email() {
        return email;
    }

    public DisplayName displayName() {
        return displayName;
    }

    public PasswordHash passwordHash() {
        return passwordHash;
    }

    public TokenHash tokenHash() {
        return tokenHash;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Optional<Instant> usedAt() {
        return Optional.ofNullable(usedAt);
    }
}
