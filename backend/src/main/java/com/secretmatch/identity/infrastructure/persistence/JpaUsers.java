package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.Users;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.User;
import org.springframework.stereotype.Repository;

@Repository
class JpaUsers implements Users {

    private final UserRepository repository;

    JpaUsers(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean existsWithEmail(EmailAddress email) {
        return repository.existsByEmail(email.value());
    }

    @Override
    public boolean add(User user) {
        return repository.insertIfEmailFree(
                        user.id().value(),
                        user.email().value(),
                        user.displayName().value(),
                        user.passwordHash().map(PasswordHash::value).orElse(null),
                        user.createdAt())
                == 1;
    }
}
