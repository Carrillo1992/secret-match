package com.secretmatch.notification.application;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param fromAddress the address every email is sent from, under the SecretMatch name
 * @param appBaseUrl the SPA's public address, which email links point into
 */
@ConfigurationProperties("secretmatch.mail")
public record MailProperties(String fromAddress, URI appBaseUrl) {

    /** Fails at startup, not at the first email, when the settings are missing. */
    public MailProperties {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalArgumentException("secretmatch.mail.from-address (MAIL_FROM_ADDRESS) must be set");
        }
        if (appBaseUrl == null || !appBaseUrl.isAbsolute()) {
            throw new IllegalArgumentException("secretmatch.mail.app-base-url (APP_BASE_URL) must be an absolute URL");
        }
    }
}
