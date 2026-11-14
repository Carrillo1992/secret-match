package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.GoogleSubject;
import com.secretmatch.identity.domain.User;
import com.secretmatch.identity.domain.UserId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Port to where Users are stored. */
public interface Users {

    boolean existsWithEmail(EmailAddress email);

    Optional<User> findByEmail(EmailAddress email);

    Optional<User> findById(UserId id);

    /** The User linked to this Google account, if any. */
    Optional<User> findByGoogleSubject(GoogleSubject subject);

    /** The Users with these ids; ids without a User are left out. */
    List<User> findAllById(Collection<UserId> ids);

    /**
     * Stores a new User, unless one with the same email or Google account exists already (for instance,
     * created a moment ago through another sign-up).
     *
     * @return {@code false} if the email or the Google account already had a User, in which case nothing was
     *     stored
     */
    boolean add(User user);

    /** Stores the changes to an existing User. */
    void save(User user);

    /**
     * Deletes the User. Their refresh tokens and Password Reset go with them, so every Session of theirs ends.
     * Does nothing if there is no such User.
     */
    void delete(UserId id);
}
