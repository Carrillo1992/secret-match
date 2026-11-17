package com.secretmatch.notification.infrastructure.push;

import com.secretmatch.notification.application.PushMessage;
import com.secretmatch.notification.application.PushSender;
import com.secretmatch.notification.domain.PushSubscription;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Outside {@code prod} without VAPID keys: pushing is off, so browsers cannot subscribe, and a push for a
 * subscription kept from before is only logged, never the endpoint.
 */
class LoggingPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingPushSender.class);

    @Override
    public Optional<String> publicKey() {
        return Optional.empty();
    }

    @Override
    public Delivery send(PushSubscription to, PushMessage message) {
        log.info(
                "Push not sent, there are no VAPID keys: \"{}\" / \"{}\" opening {}",
                message.title(),
                message.body(),
                message.linkPath());
        return Delivery.ACCEPTED;
    }
}
