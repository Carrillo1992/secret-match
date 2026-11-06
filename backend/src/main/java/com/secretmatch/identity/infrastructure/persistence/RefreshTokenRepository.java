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
 * The lookup locks the row until the transaction ends, so two refreshes with the same token cannot both
 * rotate it: the second one waits, then finds it spent.
 */
interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshTokenEntity> findLockedByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshTokenEntity t SET t.revokedAt = :now WHERE t.sessionId = :sessionId AND t.revokedAt IS NULL")
    int revokeSession(UUID sessionId, Instant now);
}
