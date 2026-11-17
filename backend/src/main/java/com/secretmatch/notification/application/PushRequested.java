package com.secretmatch.notification.application;

import java.util.UUID;

/**
 * Asks for a notification on every device where {@code recipient} turned them on, once the current transaction
 * commits. Publish it with Spring's {@code ApplicationEventPublisher} from inside a use case, next to the
 * {@link EmailRequested} for the same moment; the use case writes the text, in the recipient's Language (ADR 0003).
 *
 * <p>It shows on a lock screen, where anyone near the phone can read it: never a Message's text, never a name that
 * could tell a Receiver who their Giver is (ADR 0001).
 *
 * @param recipient the User it is for
 * @param title the notification's title
 * @param body the line under the title
 * @param linkPath the page of the app a tap opens, as a path starting with {@code /}
 * @param thread what it is about, e.g. one Mailbox: a newer notification on the same thread replaces the older one
 *     on the device. It never leaves the API as is, only as a hash, so it may be an id
 * @param urgency how soon the push service should wake the device for it
 */
public record PushRequested(
        UUID recipient, String title, String body, String linkPath, String thread, PushUrgency urgency) {

    public PushRequested {
        if (recipient == null || urgency == null) {
            throw new IllegalArgumentException("recipient and urgency must be given");
        }
        requireText(title, "title");
        requireText(body, "body");
        requireText(thread, "thread");
        requireText(linkPath, "linkPath");
        if (!linkPath.startsWith("/") || linkPath.startsWith("//")) {
            throw new IllegalArgumentException("linkPath must be a path inside the app");
        }
    }

    /** Leaves out the text and the thread: they may carry personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "PushRequested[redacted]";
    }

    private static void requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
