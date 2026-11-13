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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The signed-in User manages their Profile: the display name others see and their password, and can delete their
 * account.
 */
@Service
public class Profile {

    private final Users users;
    private final RefreshTokens refreshTokens;
    private final PasswordHasher passwordHasher;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    Profile(
            Users users,
            RefreshTokens refreshTokens,
            PasswordHasher passwordHasher,
            Clock clock,
            ApplicationEventPublisher events) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordHasher = passwordHasher;
        this.clock = clock;
        this.events = events;
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

    /**
     * Deletes the User's account with everything of theirs: the Groups they are the Admin of go with them (their
     * other Members are emailed), and they leave every other Group, whatever its state. Every Session of theirs ends,
     * and they can no longer sign in.
     *
     * @throws com.secretmatch.shared.domain.DomainException if another module refuses it ({@link
     *     UserDeletionRequested}), e.g. while they are in a Group whose Draw is made and whose Exchange Date has not
     *     passed; nothing is deleted
     * @throws SessionExpiredException if that User no longer exists
     */
    @Transactional
    public void deleteAccount(UserId id) {
        existing(id);
        events.publishEvent(new UserDeletionRequested(id.value()));
        events.publishEvent(new UserDeleted(id.value()));
        users.delete(id);
    }

    private User existing(UserId id) {
        return users.findById(id).orElseThrow(SessionExpiredException::new);
    }
}
