package com.secretmatch.notification.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, UUID> {

    /** One row per endpoint: an endpoint already there takes the new keys and now belongs to {@code userId}. */
    @Modifying
    @Query(value = """
            INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
            VALUES (:id, :userId, :endpoint, :p256dh, :auth, :createdAt)
            ON CONFLICT (endpoint) DO UPDATE
            SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
                created_at = EXCLUDED.created_at
            """, nativeQuery = true)
    int upsert(UUID id, UUID userId, String endpoint, String p256dh, String auth, Instant createdAt);

    @Modifying
    @Query(
            value = "DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND user_id = :userId",
            nativeQuery = true)
    int removeOwned(UUID userId, String endpoint);

    @Modifying
    @Query(value = "DELETE FROM push_subscriptions WHERE endpoint = :endpoint", nativeQuery = true)
    int removeEndpoint(String endpoint);

    @Query(value = "SELECT * FROM push_subscriptions WHERE user_id = :userId ORDER BY created_at", nativeQuery = true)
    List<PushSubscriptionEntity> findOf(UUID userId);
}
