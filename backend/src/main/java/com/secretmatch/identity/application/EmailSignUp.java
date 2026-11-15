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
import com.secretmatch.notification.application.EmailText;
import com.secretmatch.shared.domain.Language;
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

    private final Users users;
    private final SignUpVerifications signUps;
    private final PasswordHasher passwordHasher;
    private final LinkEmailLimits limits;
    private final ApplicationEventPublisher events;
    private final SecureRandom random;
    private final Clock clock;

    EmailSignUp(
            Users users,
            SignUpVerifications signUps,
            PasswordHasher passwordHasher,
            LinkEmailLimits limits,
            ApplicationEventPublisher events,
            SecureRandom random,
            Clock clock) {
        this.users = users;
        this.signUps = signUps;
        this.passwordHasher = passwordHasher;
        this.limits = limits;
        this.events = events;
        this.random = random;
        this.clock = clock;
    }

    /**
     * Keeps the sign-up and emails its verification link. If the email already has a User, asked too often,
     * or the daily cap is reached, nothing is kept or sent, and the id returned matches no sign-up.
     */
    @Transactional
    public SignUpId signUp(SignUpCommand command) {
        EmailAddress email = new EmailAddress(command.email());
        DisplayName displayName = new DisplayName(command.displayName());
        Language language = Language.ofCode(command.language());
        // Hashed before the lookup, so a registered email does not answer measurably faster here.
        PasswordHash passwordHash = passwordHasher.hash(new NewPassword(command.password()));
        if (!limits.allowsRequest(LinkEmailLimits.LinkRequest.SIGN_UP, email)
                || users.existsWithEmail(email)
                || !limits.allowsSending()) {
            return SignUpId.newId();
        }
        EmailLinkToken token = EmailLinkToken.generate(random);
        SignUpVerification signUp =
                SignUpVerification.start(email, displayName, passwordHash, language, token, clock.instant());
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

    /**
     * Sends a new link for this sign-up, if it is still waiting for one, its email did not ask too often and
     * the daily cap is not reached.
     */
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
        if (!limits.allowsRequest(LinkEmailLimits.LinkRequest.NEW_VERIFICATION_LINK, signUp.email())
                || signUp.isUsed()
                || users.existsWithEmail(signUp.email())
                || !limits.allowsSending()) {
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
        events.publishEvent(verificationEmail(signUp, token));
    }

    /** The Verification email, in the Language the sign-up was made in. */
    private static EmailRequested verificationEmail(SignUpVerification signUp, EmailLinkToken token) {
        return new EmailRequested(
                signUp.email().value(),
                signUp.language(),
                verificationText(signUp.language(), SignUpVerification.VALIDITY.toHours()),
                "/verify-email?token=" + token.value());
    }

    private static EmailText verificationText(Language language, long hours) {
        return switch (language) {
            case SPANISH -> new EmailText("Confirma tu correo en SecretMatch", """
                        Hola:

                        Para terminar de crear tu cuenta en SecretMatch, confirma que este correo es tuyo con el enlace \
                        de abajo. Caduca en %d horas y solo se puede usar una vez.

                        Si no has sido tú, ignora este mensaje: no se creará ninguna cuenta.""".formatted(hours));
            case ENGLISH -> new EmailText("Confirm your email on SecretMatch", """
                        Hello,

                        To finish creating your SecretMatch account, confirm that this email is yours with the link \
                        below. It expires in %d hours and can only be used once.

                        If this wasn't you, ignore this message: no account will be created.""".formatted(hours));
        };
    }
}
