package com.secretmatch.identity.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param clientId our OAuth client id in Google Cloud: the audience every ID token must name. Blank turns
 *     Google sign-in off, and every ID token is refused.
 * @param jwkSetUri where Google publishes the public keys its ID tokens are signed with
 */
@ConfigurationProperties("secretmatch.security.google")
record GoogleProperties(
        String clientId,

        @DefaultValue("https://www.googleapis.com/oauth2/v3/certs")
        String jwkSetUri) {

    boolean enabled() {
        return clientId != null && !clientId.isBlank();
    }
}
