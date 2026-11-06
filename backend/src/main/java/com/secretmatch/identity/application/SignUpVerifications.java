package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.SignUpId;
import com.secretmatch.identity.domain.SignUpVerification;
import com.secretmatch.identity.domain.TokenHash;
import java.util.Optional;

/** Port to where password sign-ups wait for their email to be verified. */
public interface SignUpVerifications {

    Optional<SignUpVerification> findById(SignUpId id);

    Optional<SignUpVerification> findByTokenHash(TokenHash tokenHash);

    void save(SignUpVerification signUp);
}
