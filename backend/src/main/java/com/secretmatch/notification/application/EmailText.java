package com.secretmatch.notification.application;

/**
 * What an email says, in one Language: the triggering module writes it (ADR 0003) and hands it to
 * {@link EmailRequested} with the recipient, their Language and the link.
 *
 * @param subject the subject line
 * @param message the body text; blank lines separate paragraphs
 */
public record EmailText(String subject, String message) {

    /** Leaves out the text: it may carry personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "EmailText[redacted]";
    }
}
