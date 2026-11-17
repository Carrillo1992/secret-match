package com.secretmatch.notification.application;

import com.secretmatch.notification.domain.PushSubscription;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Pushes each {@link PushRequested} to every device of its recipient once the transaction that published it has
 * committed, on the same executor as emails and for the same reasons (docs/architecture.md §2.5): never for a change
 * that rolled back, never making the request wait. A failed push is logged without personal data and dropped; a
 * subscription the push service no longer knows is forgotten.
 */
@Component
public class PushDelivery {

    /** How long a push service keeps a notification for a device that is off; by then the email is there. */
    static final Duration TIME_TO_LIVE = Duration.ofDays(3);

    /** The longest {@code Topic} a push service takes (RFC 8030 §5.4): 32 base64url characters. */
    private static final int TOPIC_LENGTH = 32;

    private static final Logger log = LoggerFactory.getLogger(PushDelivery.class);

    private final PushSubscriptions subscriptions;
    private final PushSender sender;

    PushDelivery(PushSubscriptions subscriptions, PushSender sender) {
        this.subscriptions = subscriptions;
        this.sender = sender;
    }

    @Async(EmailDelivery.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void deliver(PushRequested request) {
        PushMessage message = new PushMessage(
                request.title(),
                request.body(),
                request.linkPath(),
                topicOf(request.thread()),
                request.urgency(),
                TIME_TO_LIVE);
        for (PushSubscription subscription : subscriptions.ownedBy(request.recipient())) {
            pushTo(subscription, message);
        }
    }

    private void pushTo(PushSubscription subscription, PushMessage message) {
        try {
            if (sender.send(subscription, message) == PushSender.Delivery.SUBSCRIPTION_GONE) {
                subscriptions.removeEndpoint(subscription.endpoint());
            }
        } catch (PushDeliveryException e) {
            log.warn("Push not delivered: {}", e.getMessage());
        } catch (RuntimeException e) {
            // Only the exception type: its message may carry the endpoint.
            log.warn("Push not delivered ({})", e.getClass().getName());
        }
    }

    /**
     * The same opaque topic for every push on one thread: a hash, so neither the push service nor the device ever
     * sees which Mailbox or Group it is about.
     */
    private static String topicOf(String thread) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(thread.getBytes(StandardCharsets.UTF_8));
            String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
            return encoded.substring(0, TOPIC_LENGTH);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
