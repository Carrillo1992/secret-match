package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.SessionExpiredException;
import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import com.secretmatch.identity.domain.WrongPasswordException;
import java.time.Clock;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The signed-in User manages their own profile: the display name others see, and their password. */
@Service
public class Profile {

    private final Users users;
    private final RefreshTokens refreshTokens;
    private final PasswordHasher passwordHasher;
    private final Clock clock;

    Profile(Users users, RefreshTokens refreshTokens, PasswordHasher passwordHasher, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordHasher = passwordHasher;
        this.clock = clock;
    }

    /**
     * Shows the User to others by a new display name from now on.
     *
     * @throws SessionExpiredException if that User no longer exists
     */
    @Transactional
    public CurrentUser changeDisplayName(UserId id, String displayName) {
        User user = users.findById(id).orElseThrow(SessionExpiredException::new);
        user.rename(new DisplayName(displayName));
        users.save(user);
        return CurrentUser.of(user);
    }

    /**
     * Changes the User's password, or sets their first one if they have none (a User who only signs in with
     * Google). Every other Session of the User ends, so a device signed in with the old password, or without
     * one, must sign in again; the Session the change was made from stays.
     *
     * @param currentPassword the password the User has now; ignored, and may be {@code null}, if they have none
     * @throws WrongPasswordException if the User has a password and {@code currentPassword} is not it
     * @throws SessionExpiredException if that User no longer exists
     */
    @Transactional
    public void changePassword(UserId id, SessionId currentSession, String currentPassword, String newPassword) {
        PasswordHash newHash = passwordHasher.hash(new NewPassword(newPassword));
        User user = users.findById(id).orElseThrow(SessionExpiredException::new);
        Optional<PasswordHash> current = user.passwordHash();
        if (current.isPresent()
                && (currentPassword == null || !passwordHasher.matches(currentPassword, current.get()))) {
            throw new WrongPasswordException();
        }
        user.changePassword(newHash);
        users.save(user);
        refreshTokens.revokeOtherSessions(id, currentSession, clock.instant());
    }
}
