package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.EmailVerification;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.VerificationLinkInvalidException;
import com.secretmatch.identity.domain.VerificationToken;
import com.secretmatch.notification.application.EmailRequested;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign-up with email and password, and the verification of that email.
 *
 * <p>Every call that takes an email answers the same way whether or not a User has it, so the API never
 * tells a visitor which emails have accounts.
 */
@Service
public class EmailSignUp {

    static final String SUBJECT = "Confirma tu correo en SecretMatch";

    private final Users users;
    private final EmailVerifications verifications;
    private final PasswordHasher passwordHasher;
    private final ApplicationEventPublisher events;
    private final SecureRandom random;
    private final Clock clock;

    EmailSignUp(
            Users users,
            EmailVerifications verifications,
            PasswordHasher passwordHasher,
            ApplicationEventPublisher events,
            SecureRandom random,
            Clock clock) {
        this.users = users;
        this.verifications = verifications;
        this.passwordHasher = passwordHasher;
        this.events = events;
        this.random = random;
        this.clock = clock;
    }

    /**
     * Creates an unverified User and emails them a verification link. If the email belongs to an
     * unverified User, the new details replace theirs and a new link is sent; if it belongs to a verified
     * User, nothing happens.
     */
    @Transactional
    public void signUp(SignUpCommand command) {
        EmailAddress email = new EmailAddress(command.email());
        DisplayName displayName = new DisplayName(command.displayName());
        PasswordHash passwordHash = passwordHasher.hash(new NewPassword(command.password()));
        Instant now = clock.instant();

        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.signUpWithPassword(email, displayName, passwordHash, now);
        } else if (user.isEmailVerified()) {
            return;
        } else {
            user.signUpAgain(displayName, passwordHash);
        }
        users.save(user);
        sendVerificationLink(user, now);
    }

    /**
     * Marks the email of the link's User as verified.
     *
     * @throws VerificationLinkInvalidException if no link has this token
     * @throws com.secretmatch.identity.domain.VerificationLinkExpiredException if the link is too old
     * @throws com.secretmatch.identity.domain.VerificationLinkUsedException if the link, or the email, was
     *     already verified
     */
    @Transactional
    public void verifyEmail(String token) {
        EmailVerification verification = verifications
                .findByTokenHash(VerificationToken.of(token).hash())
                .orElseThrow(VerificationLinkInvalidException::new);
        Instant now = clock.instant();
        verification.use(now);
        User user = users.findById(verification.userId())
                .orElseThrow(() -> new IllegalStateException("a verification link outlived its User"));
        user.verifyEmail(now);
        verifications.save(verification);
        users.save(user);
    }

    /** Sends a new link if the email belongs to a User who has not verified it yet. */
    @Transactional
    public void sendVerificationEmail(String email) {
        users.findByEmail(new EmailAddress(email))
                .filter(user -> !user.isEmailVerified())
                .ifPresent(user -> sendVerificationLink(user, clock.instant()));
    }

    private void sendVerificationLink(User user, Instant now) {
        VerificationToken token = VerificationToken.generate(random);
        verifications.save(EmailVerification.issue(token, user.id(), now));
        events.publishEvent(new EmailRequested(
                user.email().value(),
                SUBJECT,
                """
                Hola, %s:

                Para terminar de crear tu cuenta en SecretMatch, confirma que este correo es tuyo con el enlace de abajo. Caduca en %d horas y solo se puede usar una vez.

                Si no has sido tú, ignora este mensaje: nadie podrá usar la cuenta sin confirmar el correo.""".formatted(user.displayName().value(), EmailVerification.VALIDITY.toHours()),
                "/verify-email?token=" + token.value()));
    }
}
