package com.secretmatch.notification.application;

/** A push service refused a push. The message is safe to log: never the endpoint, keys or text. */
public class PushDeliveryException extends RuntimeException {

    public PushDeliveryException(String message) {
        super(message);
    }
}
