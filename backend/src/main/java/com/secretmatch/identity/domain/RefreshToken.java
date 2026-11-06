package com.secretmatch.identity.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * One refresh token of a session. Using it rotates it: it is spent and its successor, in the same session,
 * takes over. A spent token that comes back means it was copied, so the whole session is revoked.
 */
public final class RefreshToken {

    /** How long a token works after it was issued; every refresh starts the count again. */
    public static final Duration VALIDITY = Duration.ofDays(30);

    /** What a presented token is worth at a given instant. */
    public enum State {
        /** Can be rotated. */
        ACTIVE,
        /** Already spent: presenting it again is a reuse. */
        ROTATED,
        /** Its session ended (sign-out or reuse). */
        REVOKED,
        /** Unused for too long. */
        EXPIRED
    }

    private final TokenHash tokenHash;
    private final SessionId sessionId;
    private final UserId userId;
    private final Instant expiresAt;
    private Instant rotatedAt;
    private final Instant revokedAt;

    /** Rebuilds a stored token; {@code rotatedAt} and {@code revokedAt} are {@code null} until then. */
    public RefreshToken(
            TokenHash tokenHash,
            SessionId sessionId,
            UserId userId,
            Instant expiresAt,
            Instant rotatedAt,
            Instant revokedAt) {
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.rotatedAt = rotatedAt;
        this.revokedAt = revokedAt;
    }

    /** The first token of a new session, for a User who has just signed in. */
    public static RefreshToken startSession(UserId userId, RefreshTokenValue value, Instant now) {
        return new RefreshToken(value.hash(), SessionId.newId(), userId, now.plus(VALIDITY), null, null);
    }

    /** Revoked wins over rotated, so a reuse after the session ended is just a dead token. */
    public State stateAt(Instant now) {
        if (revokedAt != null) {
            return State.REVOKED;
        }
        if (rotatedAt != null) {
            return State.ROTATED;
        }
        if (!now.isBefore(expiresAt)) {
            return State.EXPIRED;
        }
        return State.ACTIVE;
    }

    /**
     * Spends this token and returns its successor in the same session.
     *
     * @throws IllegalStateException unless the token is {@link State#ACTIVE}
     */
    public RefreshToken rotate(RefreshTokenValue next, Instant now) {
        if (stateAt(now) != State.ACTIVE) {
            throw new IllegalStateException("only an active refresh token can be rotated");
        }
        rotatedAt = now;
        return new RefreshToken(next.hash(), sessionId, userId, now.plus(VALIDITY), null, null);
    }

    public TokenHash tokenHash() {
        return tokenHash;
    }

    public SessionId sessionId() {
        return sessionId;
    }

    public UserId userId() {
        return userId;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Optional<Instant> rotatedAt() {
        return Optional.ofNullable(rotatedAt);
    }

    public Optional<Instant> revokedAt() {
        return Optional.ofNullable(revokedAt);
    }
}
