package com.secretmatch.identity.infrastructure.security;

import com.secretmatch.identity.application.PasswordHasher;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class BCryptPasswordHasher implements PasswordHasher {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public PasswordHash hash(NewPassword password) {
        return new PasswordHash(encoder.encode(password.value()));
    }

    /** A password BCrypt cannot read in full (over 72 bytes) was never accepted, so it matches nothing. */
    @Override
    public boolean matches(String password, PasswordHash hash) {
        if (password == null || password.getBytes(StandardCharsets.UTF_8).length > NewPassword.MAX_BYTES) {
            return false;
        }
        return encoder.matches(password, hash.value());
    }
}
