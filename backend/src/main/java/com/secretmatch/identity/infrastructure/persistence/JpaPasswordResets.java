package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.PasswordResets;
import com.secretmatch.identity.domain.PasswordReset;
import com.secretmatch.identity.domain.TokenHash;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaPasswordResets implements PasswordResets {

    private final PasswordResetRepository repository;

    JpaPasswordResets(PasswordResetRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<PasswordReset> findByTokenHash(TokenHash tokenHash) {
        return repository.findLockedByTokenHash(tokenHash.value()).map(PasswordResetEntity::toDomain);
    }

    @Override
    public void save(PasswordReset reset) {
        repository.upsert(
                reset.userId().value(),
                reset.tokenHash().value(),
                reset.expiresAt(),
                reset.usedAt().orElse(null));
    }
}
