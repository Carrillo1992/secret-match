package com.secretmatch.identity.infrastructure.persistence;

import com.secretmatch.identity.application.Users;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaUsers implements Users {

    private final UserRepository repository;

    JpaUsers(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<User> findById(UserId id) {
        return repository.findById(id.value()).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmail(EmailAddress email) {
        return repository.findByEmail(email.value()).map(UserEntity::toDomain);
    }

    @Override
    public void save(User user) {
        repository.save(UserEntity.from(user));
    }
}
