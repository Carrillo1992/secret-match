package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.Users;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
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
    public Optional<User> findByEmail(EmailAddress email) {
        return repository.findByEmail(email.value()).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findById(UserId id) {
        return repository.findById(id.value()).map(UserEntity::toDomain);
    }

    @Override
    public List<User> findAllById(Collection<UserId> ids) {
        return repository.findAllById(ids.stream().map(UserId::value).toList()).stream()
                .map(UserEntity::toDomain)
                .toList();
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
