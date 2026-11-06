package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.DisplayName;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.EmailLinkToken;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.SignUpId;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.VerificationLinkInvalidException;
import com.secretmatch.identity.domain.VerificationLinkUsedException;
import com.secretmatch.notification.application.EmailRequested;
import java.security.SecureRandom;
import java.time.Clock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sign-up with email and password, and the verification of that email.
 *
 * <p>Nothing here tells a caller whether an email has an account: a sign-up with a registered email gets
 * an id that matches nothing, and asking for a new link answers the same whether or not one is sent.
 */
@Service
public class EmailSignUp {

    static final String SUBJECT = "Confirma tu correo en SecretMatch";

    private final Users users;
    private final SignUpVerifications signUps;
    private final PasswordHasher passwordHasher;
    private final ApplicationEventPublisher events;
    private final SecureRandom random;
    private final Clock clock;

    EmailSignUp(
            Users users,
            SignUpVerifications signUps,
            PasswordHasher passwordHasher,
            ApplicationEventPublisher events,
            SecureRandom random,
            Clock clock) {
        this.users = users;
        this.signUps = signUps;
        this.passwordHasher = passwordHasher;
        this.events = events;
        this.random = random;
        this.clock = clock;
    }

    /**
     * Keeps the sign-up and emails its verification link. If the email already has a User, nothing is
     * kept or sent, and the id returned matches no sign-up.
     */
    @Transactional
    public SignUpId signUp(SignUpCommand command) {
        EmailAddress email = new EmailAddress(command.email());
        DisplayName displayName = new DisplayName(command.displayName());
        // Hashed before the lookup, so a registered email does not answer measurably faster here.
        PasswordHash passwordHash = passwordHasher.hash(new NewPassword(command.password()));
        if (users.existsWithEmail(email)) {
            return SignUpId.newId();
        }
        EmailLinkToken token = EmailLinkToken.generate(random);
        SignUpVerification signUp = SignUpVerification.start(email, displayName, passwordHash, token, clock.instant());
        saveAndSendLink(signUp, token);
        return signUp.id();
    }

    /**
     * Creates the User of the sign-up whose link holds this token.
     *
     * @throws VerificationLinkInvalidException if no sign-up has this token
     * @throws com.secretmatch.identity.domain.VerificationLinkExpiredException if the link is too old
     * @throws VerificationLinkUsedException if the link was already opened, or the email got a User since
     */
    @Transactional
    public void verifyEmail(EmailLinkToken token) {
        SignUpVerification signUp =
                signUps.findByTokenHash(token.hash()).orElseThrow(VerificationLinkInvalidException::new);
        User user = signUp.verify(clock.instant());
        if (!users.add(user)) {
            throw new VerificationLinkUsedException();
        }
        signUps.save(signUp);
    }

    /** Sends a new link for this sign-up, if it is still waiting for one. */
    @Transactional
    public void sendNewLink(SignUpId id) {
        signUps.findById(id).ifPresent(this::replaceLink);
    }

    /** Sends a new link in place of this one, typically an expired one, if its sign-up is still waiting. */
    @Transactional
    public void sendNewLink(EmailLinkToken previous) {
        signUps.findByTokenHash(previous.hash()).ifPresent(this::replaceLink);
    }

    private void replaceLink(SignUpVerification signUp) {
        if (signUp.isUsed() || users.existsWithEmail(signUp.email())) {
            return;
        }
        EmailLinkToken token = EmailLinkToken.generate(random);
        signUp.reissue(token, clock.instant());
        saveAndSendLink(signUp, token);
    }

    /**
     * The email names nobody: whoever signs up chooses the display name, so it must not reach an inbox
     * that may belong to someone else.
     */
    private void saveAndSendLink(SignUpVerification signUp, EmailLinkToken token) {
        signUps.save(signUp);
        events.publishEvent(new EmailRequested(
                signUp.email().value(),
                SUBJECT,
                """
                Hola:

                Para terminar de crear tu cuenta en SecretMatch, confirma que este correo es tuyo con el enlace de abajo. Caduca en %d horas y solo se puede usar una vez.

                Si no has sido tú, ignora este mensaje: no se creará ninguna cuenta.""".formatted(SignUpVerification.VALIDITY.toHours()),
                "/verify-email?token=" + token.value()));
    }
}
