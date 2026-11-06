package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.User;

/** Port to where Users are stored. */
public interface Users {

    boolean existsWithEmail(EmailAddress email);

    /**
     * Stores a new User, unless one with the same email exists already (for instance, created a moment
     * ago through another sign-up).
     *
     * @return {@code false} if the email already had a User, in which case nothing was stored
     */
    boolean add(User user);
}
