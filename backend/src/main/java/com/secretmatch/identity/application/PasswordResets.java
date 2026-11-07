package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.PasswordReset;
import com.secretmatch.identity.domain.TokenHash;
import java.util.Optional;

/**
 * Port to where Password Resets are kept, one per User. A reset found here stays locked until the
 * transaction ends, so a link opened twice at the same time still works only once.
 */
public interface PasswordResets {

    Optional<PasswordReset> findByTokenHash(TokenHash tokenHash);

    /** Stores the reset, replacing any earlier one of the same User. */
    void save(PasswordReset reset);
}
