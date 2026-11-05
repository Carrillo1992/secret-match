package com.secretmatch.notification.application;

/** A fully composed email, ready for an {@link EmailSender}. */
public record OutgoingEmail(
        String senderName, String senderAddress, String to, String subject, String html, String text) {

    /** Leaves out the recipient and the content: they may carry personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "OutgoingEmail[redacted]";
    }
}
