package com.secretmatch.identity.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A User's request to set a new password without knowing the current one, proved by opening the link
 * emailed to them. A User has at most one: asking again replaces it, so only the latest link works.
 */
public final class PasswordReset {

    /** How long a link works after it was sent. */
    public static final Duration VALIDITY = Duration.ofHours(1);

    private final UserId userId;
    private final TokenHash tokenHash;
    private final Instant expiresAt;
    private Instant usedAt;

    /** Rebuilds a stored reset; {@code usedAt} is {@code null} until its link is opened. */
    public PasswordReset(UserId userId, TokenHash tokenHash, Instant expiresAt, Instant usedAt) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.usedAt = usedAt;
    }

    public static PasswordReset start(UserId userId, EmailLinkToken token, Instant now) {
        return new PasswordReset(userId, token.hash(), now.plus(VALIDITY), null);
    }

    /**
     * Spends the link.
     *
     * @return the User whose password may now be set
     * @throws ResetLinkUsedException if the link was already opened
     * @throws ResetLinkExpiredException if its hour is over
     */
    public UserId use(Instant now) {
        if (usedAt != null) {
            throw new ResetLinkUsedException();
        }
        if (!now.isBefore(expiresAt)) {
            throw new ResetLinkExpiredException();
        }
        usedAt = now;
        return userId;
    }

    public UserId userId() {
        return userId;
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
