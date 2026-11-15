package com.secretmatch.identity.infrastructure.security;

import java.security.MessageDigest;
import java.util.Base64;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Refuses to start {@code prod} with the local placeholder signing key that ships in .env.example and as the
 * JWT_SIGNING_KEY default in docker-compose.yml: anybody can read it, so they could sign their own access tokens.
 * Every other profile keeps accepting it (#101).
 */
@Component
@Profile("prod")
class ProductionSigningKeyCheck {

    private static final byte[] LOCAL_PLACEHOLDER =
            Base64.getDecoder().decode("bG9jYWwtb25seS1wbGFjZWhvbGRlci1jaGFuZ2UtbWUtMDEyMzQ1Ng==");

    ProductionSigningKeyCheck(JwtProperties properties) {
        if (MessageDigest.isEqual(properties.keyBytes(), LOCAL_PLACEHOLDER)) {
            throw new IllegalStateException(
                    "secretmatch.security.jwt.signing-key (JWT_SIGNING_KEY) is the public local placeholder from"
                            + " .env.example; set a random key of your own in prod (e.g. `openssl rand -base64 32`)");
        }
    }
}
