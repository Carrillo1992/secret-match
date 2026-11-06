package com.secretmatch.identity.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

/**
 * Lookups lock the row until the transaction ends, so opening a link and asking for a new one at the
 * same time cannot overwrite each other: a link stays single-use even under concurrent requests.
 */
interface SignUpVerificationRepository extends JpaRepository<SignUpVerificationEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SignUpVerificationEntity> findLockedById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SignUpVerificationEntity> findLockedByTokenHash(String tokenHash);

    List<SignUpVerificationEntity> findByEmailAndUsedAtIsNull(String email);
}
