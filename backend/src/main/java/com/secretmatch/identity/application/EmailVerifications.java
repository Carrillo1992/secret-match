package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.EmailVerification;
import java.util.Optional;

/** Port to where verification links are stored, by the hash of their token. */
public interface EmailVerifications {

    Optional<EmailVerification> findByTokenHash(String tokenHash);

    void save(EmailVerification verification);
}
