package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.SignUpId;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.TokenHash;
import java.util.List;
import java.util.Optional;

/**
 * Port to where password sign-ups wait for their email to be verified. A sign-up found here stays locked
 * until the transaction ends, so two requests about the same sign-up never overwrite each other.
 */
public interface SignUpVerifications {

    Optional<SignUpVerification> findById(SignUpId id);

    Optional<SignUpVerification> findByTokenHash(TokenHash tokenHash);

    /** The sign-ups for this email whose link was never opened, without locking them. */
    List<SignUpVerification> findWaitingFor(EmailAddress email);

    void save(SignUpVerification signUp);
}
