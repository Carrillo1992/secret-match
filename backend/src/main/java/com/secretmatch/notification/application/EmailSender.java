package com.secretmatch.notification.application;

/** Port to the email provider: Resend in {@code prod}, the local mail catcher elsewhere. */
public interface EmailSender {

    /**
     * Hands the email to the provider.
     *
     * @throws EmailDeliveryException if the provider does not accept it; any other exception (e.g. a
     *     network failure) may also escape, and its message must be treated as unsafe to log
     */
    void send(OutgoingEmail email);
}
