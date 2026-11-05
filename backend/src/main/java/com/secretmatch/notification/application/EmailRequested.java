package com.secretmatch.notification.application;

/**
 * Asks for one email to be sent once the current transaction commits. Publish it with Spring's
 * {@code ApplicationEventPublisher} from inside a use case; it is never sent for a change that
 * rolls back (docs/architecture.md §2.5).
 *
 * @param recipient the email address it is sent to
 * @param subject the subject line, in Spanish
 * @param message the body text, in Spanish; blank lines separate paragraphs
 * @param linkPath the page of the app the email links to, as a path starting with {@code /}
 */
public record EmailRequested(String recipient, String subject, String message, String linkPath) {

    public EmailRequested {
        requireText(recipient, "recipient");
        requireText(subject, "subject");
        requireText(message, "message");
        requireText(linkPath, "linkPath");
        if (!linkPath.startsWith("/") || linkPath.startsWith("//")) {
            throw new IllegalArgumentException("linkPath must be a path inside the app");
        }
    }

    /** Leaves out every field: they all may carry personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "EmailRequested[redacted]";
    }

    private static void requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
