package com.secretmatch.notification.application;

/** How soon the push service should wake a device for a notification (RFC 8030 §5.3). */
public enum PushUrgency {
    /** Can wait for the device's next wake-up, e.g. the Draw is made. */
    NORMAL,
    /** Worth waking the device for, e.g. someone wrote in a Mailbox. */
    HIGH
}
