package com.secretmatch.identity.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

interface EmailVerificationRepository extends JpaRepository<EmailVerificationEntity, String> {}
