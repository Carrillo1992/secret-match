package com.secretmatch.notification.application;

import com.secretmatch.notification.domain.PushSubscription;
import java.util.Optional;

/**
 * Port to the browsers' push services (Web Push with VAPID). Without VAPID keys, outside {@code prod}, an adapter
 * that only logs what it would have sent.
 */
public interface PushSender {

    /** What became of a push. */
    enum Delivery {
        /** The push service took it. */
        ACCEPTED,
        /** The subscription no longer exists (404 or 410): the browser unsubscribed or the app was uninstalled. */
        SUBSCRIPTION_GONE
    }

    /**
     * The public key browsers subscribe with, base64url; empty when pushing is off (no VAPID keys outside
     * {@code prod}).
     */
    Optional<String> publicKey();

    /**
     * @throws PushDeliveryException if the push service refuses it for another reason; any other exception (e.g. a
     *     network failure) may also escape, and its message must be treated as unsafe to log
     */
    Delivery send(PushSubscription to, PushMessage message);
}
