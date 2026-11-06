package com.secretmatch.identity.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/** One verification link sent to a User: single-use, and valid for 24 hours. */
public final class EmailVerification {

    public static final Duration VALIDITY = Duration.ofHours(24);

    private final String tokenHash;
    private final UserId userId;
    private final Instant expiresAt;
    private Instant usedAt;

    /** Rebuilds a stored link; {@code usedAt} is {@code null} while unused. */
    public EmailVerification(String tokenHash, UserId userId, Instant expiresAt, Instant usedAt) {
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.usedAt = usedAt;
    }

    public static EmailVerification issue(VerificationToken token, UserId userId, Instant now) {
        return new EmailVerification(token.hash(), userId, now.plus(VALIDITY), null);
    }

    /**
     * Spends the link.
     *
     * @throws VerificationLinkUsedException if it was already used
     * @throws VerificationLinkExpiredException if its 24 hours are over
     */
    public void use(Instant now) {
        if (usedAt != null) {
            throw new VerificationLinkUsedException();
        }
        if (!now.isBefore(expiresAt)) {
            throw new VerificationLinkExpiredException();
        }
        usedAt = now;
    }

    public String tokenHash() {
        return tokenHash;
    }

    public UserId userId() {
        return userId;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Optional<Instant> usedAt() {
        return Optional.ofNullable(usedAt);
    }
}
