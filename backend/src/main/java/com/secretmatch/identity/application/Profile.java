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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The signed-in User manages their Profile: the display name others see, and their password. */
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
    public CurrentUser changeDisplayName(UserId id, ChangeDisplayNameCommand command) {
        User user = existing(id);
        user.rename(new DisplayName(command.displayName()));
        users.save(user);
        return CurrentUser.of(user);
    }

    /**
     * Changes the User's password, or sets their first one if they have none (a User who only signs in with
     * Google). Every other Session of the User ends, so a device signed in with the old password, or without
     * one, must sign in again; the Session the change was made from stays.
     *
     * @throws WrongPasswordException if the User has a password and the command's current one is not it
     * @throws SessionExpiredException if that User no longer exists
     */
    @Transactional
    public void changePassword(UserId id, SessionId currentSession, ChangePasswordCommand command) {
        PasswordHash newHash = passwordHasher.hash(new NewPassword(command.newPassword()));
        User user = existing(id);
        user.changePassword(command.currentPassword(), newHash, passwordHasher);
        users.save(user);
        refreshTokens.revokeOtherSessions(id, currentSession, clock.instant());
    }

    private User existing(UserId id) {
        return users.findById(id).orElseThrow(SessionExpiredException::new);
    }
}
