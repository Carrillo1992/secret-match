package com.secretmatch.identity.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A person's account. A User only exists once their email is verified: a password sign-up waits as a
 * {@link SignUpVerification} until then, and Google verifies the email of a Google sign-in. A User may have a
 * password, a Google link, or both.
 */
public final class User {

    private final UserId id;
    private final EmailAddress email;
    private DisplayName displayName;
    private PasswordHash passwordHash;
    private GoogleSubject googleSubject;
    private final Instant createdAt;

    /**
     * Rebuilds a stored User; {@code passwordHash} is {@code null} for a User without a password, and
     * {@code googleSubject} for a User without a Google link.
     */
    public User(
            UserId id,
            EmailAddress email,
            DisplayName displayName,
            PasswordHash passwordHash,
            GoogleSubject googleSubject,
            Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
        this.displayName = Objects.requireNonNull(displayName, "displayName");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.passwordHash = passwordHash;
        this.googleSubject = googleSubject;
    }

    static User withPassword(
            UserId id, EmailAddress email, DisplayName displayName, PasswordHash passwordHash, Instant now) {
        return new User(id, email, displayName, Objects.requireNonNull(passwordHash, "passwordHash"), null, now);
    }

    /**
     * A User created by signing in with Google, with no password. They are shown by their name in Google, cut
     * to the display name limit, or by the start of their email when Google gives no name.
     *
     * @param googleName the ID token's {@code name}; may be {@code null}
     */
    public static User fromGoogle(
            UserId id, EmailAddress email, String googleName, GoogleSubject googleSubject, Instant now) {
        return new User(
                id,
                email,
                displayNameFor(googleName, email),
                null,
                Objects.requireNonNull(googleSubject, "googleSubject"),
                now);
    }

    /**
     * Links the User's Google account, so they can sign in with it as well as with any password they have.
     * Linking the same account again changes nothing.
     *
     * @throws GoogleSignInRejectedException if the User is already linked to another Google account
     */
    public void linkGoogle(GoogleSubject subject) {
        Objects.requireNonNull(subject, "subject");
        if (googleSubject != null && !googleSubject.equals(subject)) {
            throw new GoogleSignInRejectedException();
        }
        this.googleSubject = subject;
    }

    /** From now on, the User is shown to others by this name. */
    public void rename(DisplayName newDisplayName) {
        this.displayName = Objects.requireNonNull(newDisplayName, "newDisplayName");
    }

    /**
     * From now on, the User signs in with the new password. A User who has a password must prove it first; a
     * User without one (who only signs in with Google) gets their first without.
     *
     * @param currentPassword the password as typed; ignored, and may be {@code null}, if the User has none
     * @throws WrongPasswordException if the User has a password and {@code currentPassword} is not it
     */
    public void changePassword(String currentPassword, PasswordHash newPasswordHash, PasswordMatcher matcher) {
        Objects.requireNonNull(newPasswordHash, "newPasswordHash");
        if (passwordHash != null && (currentPassword == null || !matcher.matches(currentPassword, passwordHash))) {
            throw new WrongPasswordException();
        }
        this.passwordHash = newPasswordHash;
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

    public Optional<GoogleSubject> googleSubject() {
        return Optional.ofNullable(googleSubject);
    }

    public Instant createdAt() {
        return createdAt;
    }

    private static DisplayName displayNameFor(String googleName, EmailAddress email) {
        String name = googleName == null || googleName.isBlank()
                ? email.value().substring(0, email.value().indexOf('@'))
                : googleName.strip();
        if (name.length() <= DisplayName.MAX_LENGTH) {
            return new DisplayName(name);
        }
        // Never split a character outside the BMP (an emoji) in half.
        int end = Character.isHighSurrogate(name.charAt(DisplayName.MAX_LENGTH - 1))
                ? DisplayName.MAX_LENGTH - 1
                : DisplayName.MAX_LENGTH;
        return new DisplayName(name.substring(0, end));
    }
}
