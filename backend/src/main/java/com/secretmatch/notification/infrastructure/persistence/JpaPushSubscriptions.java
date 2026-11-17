package com.secretmatch.notification.infrastructure.persistence;

import com.secretmatch.notification.application.PushSubscriptions;
import com.secretmatch.notification.domain.PushSubscription;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
class JpaPushSubscriptions implements PushSubscriptions {

    private final PushSubscriptionRepository subscriptions;
    private final Clock clock;

    JpaPushSubscriptions(PushSubscriptionRepository subscriptions, Clock clock) {
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    @Override
    public void save(UUID user, PushSubscription subscription) {
        subscriptions.upsert(
                UUID.randomUUID(),
                user,
                subscription.endpoint().toString(),
                subscription.p256dh(),
                subscription.auth(),
                clock.instant());
    }

    @Override
    public void remove(UUID user, URI endpoint) {
        subscriptions.removeOwned(user, endpoint.toString());
    }

    // Called from delivery, outside any use case's transaction.
    @Override
    @Transactional
    public void remove(URI endpoint) {
        subscriptions.removeEndpoint(endpoint.toString());
    }

    @Override
    public List<PushSubscription> of(UUID user) {
        return subscriptions.findOf(user).stream()
                .map(PushSubscriptionEntity::toSubscription)
                .toList();
    }
}
