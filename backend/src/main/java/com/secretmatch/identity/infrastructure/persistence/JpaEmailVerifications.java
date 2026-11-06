package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.EmailVerifications;
import com.secretmatch.identity.domain.EmailVerification;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaEmailVerifications implements EmailVerifications {

    private final EmailVerificationRepository repository;

    JpaEmailVerifications(EmailVerificationRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<EmailVerification> findByTokenHash(String tokenHash) {
        return repository.findById(tokenHash).map(EmailVerificationEntity::toDomain);
    }

    @Override
    public void save(EmailVerification verification) {
        repository.save(EmailVerificationEntity.from(verification));
    }
}
