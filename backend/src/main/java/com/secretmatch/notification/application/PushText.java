package com.secretmatch.notification.application;

/**
 * What a Device Notification says, in one Language: the triggering module writes it (ADR 0003) and hands it to
 * {@link PushRequested} with the recipient, the link and the thread.
 *
 * @param title the notification's title
 * @param body the line under the title
 */
public record PushText(String title, String body) {

    /** Leaves out the text: it may carry personal data (anonymity invariant). */
    @Override
    public String toString() {
        return "PushText[redacted]";
    }
}
