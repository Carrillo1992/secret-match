package com.secretmatch.notification.application;

import java.time.Duration;

/**
 * One notification, ready for the {@link PushSender}.
 *
 * @param topic opaque and the same for every notification on one thread, so the newer replaces the older; used as
 *     the push service's {@code Topic} and the notification's {@code tag}
 * @param timeToLive how long the push service keeps it for a device that is off
 */
public record PushMessage(
        String title, String body, String linkPath, String topic, PushUrgency urgency, Duration timeToLive) {

    @Override
    public String toString() {
        return "PushMessage[redacted]";
    }
}
