package com.secretmatch.identity.infrastructure;

import java.security.SecureRandom;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class IdentityConfiguration {

    /** The source of verification-link tokens. */
    @Bean
    SecureRandom secureRandom() {
        return new SecureRandom();
    }
}
