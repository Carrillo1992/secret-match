package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.EmailNotVerifiedException;
import com.secretmatch.identity.domain.GoogleSignInRejectedException;
import com.secretmatch.identity.domain.InvalidCredentialsException;
import com.secretmatch.identity.domain.InvalidUserDetailsException;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.RefreshToken;
import com.secretmatch.identity.domain.RefreshTokenValue;
import com.secretmatch.identity.domain.SessionExpiredException;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signing in with email and password or with Google, keeping the session alive with rotating refresh tokens, and signing
 * out (docs/architecture.md §2.4).
 */
@Service
public class Sessions {

    private final Users users;
    private final SignUpVerifications signUps;
    private final RefreshTokens refreshTokens;
    private final AccessTokens accessTokens;
    private final GoogleIdTokens googleIdTokens;
    private final PasswordHasher passwordHasher;
    private final SecureRandom random;
    private final Clock clock;

    /**
     * Checked when there is no password to check, so an unknown email takes as long to refuse as a wrong
     * password and the timing does not tell which emails have an account.
     */
    private final PasswordHash timingDecoy;

    Sessions(
            Users users,
            SignUpVerifications signUps,
            RefreshTokens refreshTokens,
            AccessTokens accessTokens,
            GoogleIdTokens googleIdTokens,
            PasswordHasher passwordHasher,
            SecureRandom random,
            Clock clock) {
        this.users = users;
        this.signUps = signUps;
        this.refreshTokens = refreshTokens;
        this.accessTokens = accessTokens;
        this.googleIdTokens = googleIdTokens;
        this.passwordHasher = passwordHasher;
        this.random = random;
        this.clock = clock;
        this.timingDecoy = passwordHasher.hash(new NewPassword("timing-decoy-password"));
    }

    /**
     * Starts a session for the User with this email and password.
     *
     * @throws InvalidCredentialsException if the email has no User or the password is wrong
     * @throws EmailNotVerifiedException if the password is that of a sign-up still waiting for its link
     */
    @Transactional
    public SignedIn signIn(SignInCommand command) {
        Optional<EmailAddress> email = emailIn(command);
        Optional<User> user = email.flatMap(users::findByEmail);
        if (user.isPresent()) {
            Optional<PasswordHash> hash = user.get().passwordHash();
            boolean matches = passwordHasher.matches(command.password(), hash.orElse(timingDecoy));
            if (hash.isEmpty() || !matches) {
                throw new InvalidCredentialsException();
            }
            return startSession(user.get().id());
        }
        List<SignUpVerification> waiting = email.map(signUps::findWaitingFor).orElseGet(List::of);
        if (waiting.stream().anyMatch(signUp -> passwordHasher.matches(command.password(), signUp.passwordHash()))) {
            throw new EmailNotVerifiedException();
        }
        if (waiting.isEmpty()) {
            passwordHasher.matches(command.password(), timingDecoy);
        }
        throw new InvalidCredentialsException();
    }

    /**
     * Starts a session for the person a Google ID token names. The User linked to that Google account signs
     * in, even if the account's email has changed since. Otherwise a new email gets a User named as in
     * Google, and an email that already has a User gets the Google account linked to it: any password keeps
     * working.
     *
     * @throws GoogleSignInRejectedException if the ID token is not genuine, not for us, expired or for an
     *     unverified email, or the email's User is linked to another Google account
     */
    @Transactional
    public SignedIn signInWithGoogle(String idToken) {
        GoogleIdentity google = googleIdTokens.verify(idToken);
        User user = users.findByGoogleSubject(google.subject())
                .or(() -> users.findByEmail(google.email()))
                .orElseGet(() -> newGoogleUser(google));
        if (!user.googleSubject().equals(Optional.of(google.subject()))) {
            user.linkGoogle(google.subject());
            users.save(user);
        }
        return startSession(user.id());
    }

    /**
     * Swaps the refresh token from the cookie for a new access token and a new refresh token. A token that
     * was already swapped ends its whole session, because only a copy of it can come back; unless it was
     * swapped a moment ago, which is a concurrent refresh from another tab rather than a copy.
     *
     * @param cookieValue the refresh token as the cookie carried it; {@code null} or blank when there was none
     * @throws SessionExpiredException if the token is missing, unknown, expired, revoked or reused
     */
    @Transactional(noRollbackFor = SessionExpiredException.class)
    public RefreshOutcome refresh(String cookieValue) {
        RefreshTokenValue presented = presentedToken(cookieValue).orElseThrow(SessionExpiredException::new);
        Instant now = clock.instant();
        RefreshToken token = refreshTokens.findByTokenHash(presented.hash()).orElseThrow(SessionExpiredException::new);
        return switch (token.stateAt(now)) {
            case ACTIVE -> new RefreshOutcome.Rotated(rotate(token, now));
            case JUST_ROTATED ->
                new RefreshOutcome.AlreadyRotated(accessTokens.issueFor(token.userId(), token.sessionId()));
            case ROTATED -> {
                refreshTokens.revokeSession(token.sessionId(), now);
                throw new SessionExpiredException();
            }
            case REVOKED, EXPIRED -> throw new SessionExpiredException();
        };
    }

    /**
     * Ends the session of the refresh token from the cookie, if it has one. Signing out twice, or without a
     * cookie, is not an error.
     */
    @Transactional
    public void signOut(String cookieValue) {
        presentedToken(cookieValue)
                .flatMap(presented -> refreshTokens.findByTokenHash(presented.hash()))
                .ifPresent(token -> refreshTokens.revokeSession(token.sessionId(), clock.instant()));
    }

    /**
     * The User an access token was issued to.
     *
     * @throws SessionExpiredException if that User no longer exists
     */
    @Transactional(readOnly = true)
    public CurrentUser currentUser(UserId id) {
        User user = users.findById(id).orElseThrow(SessionExpiredException::new);
        return CurrentUser.of(user);
    }

    /** Creates the User, or takes the one created a moment ago with the same email by another sign-in. */
    private User newGoogleUser(GoogleIdentity google) {
        User user = User.fromGoogle(UserId.newId(), google.email(), google.name(), google.subject(), clock.instant());
        return users.add(user)
                ? user
                : users.findByEmail(google.email()).orElseThrow(GoogleSignInRejectedException::new);
    }

    private SignedIn rotate(RefreshToken token, Instant now) {
        RefreshTokenValue next = RefreshTokenValue.generate(random);
        RefreshToken successor = token.rotate(next, now);
        refreshTokens.save(token);
        refreshTokens.save(successor);
        return new SignedIn(accessTokens.issueFor(token.userId(), token.sessionId()), next);
    }

    private SignedIn startSession(UserId userId) {
        RefreshTokenValue value = RefreshTokenValue.generate(random);
        RefreshToken token = RefreshToken.startSession(userId, value, clock.instant());
        refreshTokens.save(token);
        return new SignedIn(accessTokens.issueFor(userId, token.sessionId()), value);
    }

    private static Optional<RefreshTokenValue> presentedToken(String cookieValue) {
        return cookieValue == null || cookieValue.isBlank()
                ? Optional.empty()
                : Optional.of(RefreshTokenValue.of(cookieValue));
    }

    /** A malformed email cannot have a User; it is refused like any unknown one. */
    private static Optional<EmailAddress> emailIn(SignInCommand command) {
        try {
            return Optional.of(new EmailAddress(command.email()));
        } catch (InvalidUserDetailsException e) {
            return Optional.empty();
        }
    }
}
