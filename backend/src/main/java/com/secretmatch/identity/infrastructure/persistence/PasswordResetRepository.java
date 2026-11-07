package com.secretmatch.identity.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

/**
 * The lookup locks the row until the transaction ends, so a link opened twice at the same time is spent
 * by the first request and found used by the second.
 */
interface PasswordResetRepository extends JpaRepository<PasswordResetEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetEntity> findLockedByTokenHash(String tokenHash);
}
