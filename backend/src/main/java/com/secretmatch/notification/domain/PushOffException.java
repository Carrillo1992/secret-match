package com.secretmatch.notification.domain;

import com.secretmatch.shared.domain.NotFoundException;

/** Pushing is off on this API: it has no VAPID keys (only possible outside {@code prod}). */
public class PushOffException extends NotFoundException {

    public PushOffException() {
        super("push-off", "Notifications on devices are not available here.");
    }
}
