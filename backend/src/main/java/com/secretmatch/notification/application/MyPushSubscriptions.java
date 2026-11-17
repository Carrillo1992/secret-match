package com.secretmatch.notification.application;

import com.secretmatch.notification.domain.PushSubscription;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The signed-in User turning notifications on and off for the device they are on (#119). */
@Service
public class MyPushSubscriptions {

    private final PushSubscriptions subscriptions;
    private final PushSender sender;

    MyPushSubscriptions(PushSubscriptions subscriptions, PushSender sender) {
        this.subscriptions = subscriptions;
        this.sender = sender;
    }

    /** The key browsers subscribe with; empty when pushing is off. */
    public Optional<String> publicKey() {
        return sender.publicKey();
    }

    /**
     * Notifications for {@code user} go to this device from now on. A device that was someone else's is theirs now:
     * the browser on it subscribed again, so whoever had it before is no longer signed in there.
     *
     * @throws com.secretmatch.notification.domain.InvalidPushSubscriptionException if it is not a subscription to a
     *     browser's push service
     */
    @Transactional
    public void subscribe(UUID user, String endpoint, String p256dh, String auth) {
        subscriptions.save(user, PushSubscription.of(endpoint, p256dh, auth));
    }

    /** No more notifications on this device, if it is {@code user}'s; anyone else's stays as it is. */
    @Transactional
    public void unsubscribe(UUID user, String endpoint) {
        subscriptions.removeOwnedBy(user, PushSubscription.parsed(endpoint));
    }
}
