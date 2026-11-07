package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import com.secretmatch.identity.domain.PasswordMatcher;

/** Port to the one-way password hashing algorithm. */
public interface PasswordHasher extends PasswordMatcher {

    PasswordHash hash(NewPassword password);
}
