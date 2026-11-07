package com.secretmatch.identity.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * The lookup locks the row until the transaction ends, so a link opened twice at the same time is spent
 * by the first request and found used by the second.
 */
interface PasswordResetRepository extends JpaRepository<PasswordResetEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetEntity> findLockedByTokenHash(String tokenHash);

    /**
     * Inserts the User's reset or replaces it in one statement, so two requests for the same User at the
     * same time cannot both try to insert it.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = "INSERT INTO password_resets (user_id, token_hash, expires_at, used_at)"
                    + " VALUES (:userId, :tokenHash, :expiresAt, :usedAt)"
                    + " ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash,"
                    + " expires_at = EXCLUDED.expires_at, used_at = EXCLUDED.used_at",
            nativeQuery = true)
    void upsert(UUID userId, String tokenHash, Instant expiresAt, Instant usedAt);
}
