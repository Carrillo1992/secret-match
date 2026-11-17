package com.secretmatch.notification.infrastructure.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The VAPID key pair and contact under {@code secretmatch.push.vapid} (see application.yml).
 *
 * @param publicKey the uncompressed P-256 point, base64url; blank when pushing is off
 * @param privateKey its private scalar, base64url; blank when pushing is off
 * @param subject a {@code mailto:} or {@code https:} contact for the push services
 */
@ConfigurationProperties("secretmatch.push.vapid")
record VapidProperties(String publicKey, String privateKey, String subject) {

    boolean configured() {
        return publicKey != null && !publicKey.isBlank() && privateKey != null && !privateKey.isBlank();
    }

    @Override
    public String toString() {
        return "VapidProperties[redacted]";
    }
}
