package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.SignUpVerifications;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.SignUpId;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.TokenHash;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaSignUpVerifications implements SignUpVerifications {

    private final SignUpVerificationRepository repository;

    JpaSignUpVerifications(SignUpVerificationRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<SignUpVerification> findById(SignUpId id) {
        return repository.findLockedById(id.value()).map(SignUpVerificationEntity::toDomain);
    }

    @Override
    public Optional<SignUpVerification> findByTokenHash(TokenHash tokenHash) {
        return repository.findLockedByTokenHash(tokenHash.value()).map(SignUpVerificationEntity::toDomain);
    }

    @Override
    public List<SignUpVerification> findWaitingFor(EmailAddress email) {
        return repository.findByEmailAndUsedAtIsNull(email.value()).stream()
                .map(SignUpVerificationEntity::toDomain)
                .toList();
    }

    @Override
    public void save(SignUpVerification signUp) {
        repository.save(SignUpVerificationEntity.from(signUp));
    }
}
