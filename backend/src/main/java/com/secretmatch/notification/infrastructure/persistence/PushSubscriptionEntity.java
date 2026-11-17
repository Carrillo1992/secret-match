package com.secretmatch.notification.infrastructure.persistence;

import com.secretmatch.notification.domain.PushSubscription;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.net.URI;
import java.util.UUID;

/** The {@code push_subscriptions} table. Its rows are added with a native upsert in {@link PushSubscriptionRepository}. */
@Entity
@Table(name = "push_subscriptions")
class PushSubscriptionEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String endpoint;

    @Column(nullable = false)
    private String p256dh;

    @Column(nullable = false)
    private String auth;

    protected PushSubscriptionEntity() {}

    PushSubscription toSubscription() {
        return new PushSubscription(URI.create(endpoint), p256dh, auth);
    }
}
