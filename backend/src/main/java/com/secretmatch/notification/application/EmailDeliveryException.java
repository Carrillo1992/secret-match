package com.secretmatch.notification.application;

/**
 * An email provider did not accept an email. The message must be safe to log: never an address, a
 * name, a subject or a body.
 */
public class EmailDeliveryException extends RuntimeException {

    public EmailDeliveryException(String safeReason) {
        super(safeReason);
    }
}
