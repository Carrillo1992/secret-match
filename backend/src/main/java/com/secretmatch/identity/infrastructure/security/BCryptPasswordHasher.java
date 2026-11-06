package com.secretmatch.identity.infrastructure.security;

import com.secretmatch.identity.application.PasswordHasher;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class BCryptPasswordHasher implements PasswordHasher {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public PasswordHash hash(NewPassword password) {
        return new PasswordHash(encoder.encode(password.value()));
    }
}
