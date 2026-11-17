package com.secretmatch.notification.application;

import com.secretmatch.notification.domain.PushSubscription;
import java.net.URI;
import java.util.List;
import java.util.UUID;

/** Port to where push subscriptions are kept: each belongs to one User, a User may have one per device. */
public interface PushSubscriptions {

    /**
     * Keeps {@code subscription} for {@code user}. One already kept with the same endpoint is replaced and now
     * belongs to {@code user}: the browser on that device is theirs now.
     */
    void save(UUID user, PushSubscription subscription);

    /** Forgets the subscription with that endpoint if it belongs to {@code user}. */
    void removeOwnedBy(UUID user, URI endpoint);

    /** Forgets the subscription with that endpoint, whoever it belongs to. */
    void removeEndpoint(URI endpoint);

    /** Every device {@code user} turned notifications on for. */
    List<PushSubscription> ownedBy(UUID user);
}
