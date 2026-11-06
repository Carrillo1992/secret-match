package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import java.util.Optional;

/** Port to where Users are stored. */
public interface Users {

    Optional<User> findById(UserId id);

    Optional<User> findByEmail(EmailAddress email);

    void save(User user);
}
