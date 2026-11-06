package com.secretmatch.identity.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SignUpVerificationRepository extends JpaRepository<SignUpVerificationEntity, UUID> {

    Optional<SignUpVerificationEntity> findByTokenHash(String tokenHash);
}
