package com.secretmatch.notification.domain;

import com.secretmatch.shared.domain.DomainException;

/** A push subscription that is not one a browser's Push API produces. The message never repeats it. */
public class InvalidPushSubscriptionException extends DomainException {

    public InvalidPushSubscriptionException() {
        super("invalid-push-subscription", "This is not a push subscription from a supported browser's push service.");
    }
}
