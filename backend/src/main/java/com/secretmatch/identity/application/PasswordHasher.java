package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;

/** Port to the one-way password hashing algorithm. */
public interface PasswordHasher {

    PasswordHash hash(NewPassword password);

    /** Whether this password, as typed at sign-in, is the one the hash was made from. */
    boolean matches(String password, PasswordHash hash);
}
