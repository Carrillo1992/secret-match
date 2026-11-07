package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.EmailLinkToken;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.PasswordReset;
import com.secretmatch.identity.domain.ResetLinkInvalidException;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import com.secretmatch.notification.application.EmailRequested;
import java.security.SecureRandom;
import java.time.Clock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Password Reset: a signed-out User who forgot their password sets a new one through a link emailed to
 * them. A User without a password (who only signs in with Google) sets their first one the same way.
 *
 * <p>Asking for a link answers the same whether or not the email has a User; only a User gets an email.
 */
@Service
public class PasswordResetting {

    static final String SUBJECT = "Elige una contraseña nueva en SecretMatch";

    private final Users users;
    private final PasswordResets resets;
    private final RefreshTokens refreshTokens;
    private final PasswordHasher passwordHasher;
    private final ApplicationEventPublisher events;
    private final SecureRandom random;
    private final Clock clock;

    PasswordResetting(
            Users users,
            PasswordResets resets,
            RefreshTokens refreshTokens,
            PasswordHasher passwordHasher,
            ApplicationEventPublisher events,
            SecureRandom random,
            Clock clock) {
        this.users = users;
        this.resets = resets;
        this.refreshTokens = refreshTokens;
        this.passwordHasher = passwordHasher;
        this.events = events;
        this.random = random;
        this.clock = clock;
    }

    /**
     * Emails a reset link to the User with this email, replacing any earlier link of theirs. An email
     * without a User gets nothing, and the caller cannot tell.
     */
    @Transactional
    public void sendResetLink(EmailAddress email) {
        users.findByEmail(email).ifPresent(this::issueLinkTo);
    }

    /**
     * Sets the password of the User whose link holds this token, and ends every Session of theirs: whoever
     * knew the old password, or held a stolen Session, is signed out.
     *
     * @throws ResetLinkInvalidException if no reset has this token
     * @throws com.secretmatch.identity.domain.ResetLinkExpiredException if the link is too old
     * @throws com.secretmatch.identity.domain.ResetLinkUsedException if the link was already opened
     */
    @Transactional
    public void resetPassword(ResetPasswordCommand command) {
        PasswordHash newHash = passwordHasher.hash(new NewPassword(command.newPassword()));
        PasswordReset reset =
                resets.findByTokenHash(command.token().hash()).orElseThrow(ResetLinkInvalidException::new);
        UserId userId = reset.use(clock.instant());
        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalStateException("a Password Reset outlived its User"));
        user.resetPassword(newHash);
        users.save(user);
        resets.save(reset);
        refreshTokens.revokeAllSessions(userId, clock.instant());
    }

    /** The email does not name the User: whoever asks only knows the email, not who owns it. */
    private void issueLinkTo(User user) {
        EmailLinkToken token = EmailLinkToken.generate(random);
        resets.save(PasswordReset.start(user.id(), token, clock.instant()));
        events.publishEvent(new EmailRequested(
                user.email().value(),
                SUBJECT,
                """
                Hola:

                Alguien ha pedido elegir una contraseña nueva para tu cuenta de SecretMatch. Si has sido tú, elígela con el enlace de abajo. Caduca en %d hora y solo se puede usar una vez.

                Si no has sido tú, ignora este mensaje: tu contraseña no cambiará.""".formatted(PasswordReset.VALIDITY.toHours()),
                "/reset-password?token=" + token.value()));
    }
}
