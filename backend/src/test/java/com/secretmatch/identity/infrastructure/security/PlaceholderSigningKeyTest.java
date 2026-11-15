package com.secretmatch.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.PrintWriter;
import java.io.StringWriter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/** Ticket #101: the local placeholder signing key is refused in prod and keeps working everywhere else. */
class PlaceholderSigningKeyTest {

    /** The placeholder from .env.example and the JWT_SIGNING_KEY default in docker-compose.yml. */
    private static final String PLACEHOLDER = "bG9jYWwtb25seS1wbGFjZWhvbGRlci1jaGFuZ2UtbWUtMDEyMzQ1Ng==";

    private static final String OWN_KEY = "dGVzdC1vbmx5LWp3dC1zaWduaW5nLWtleS1ub3QtYS1zZWNyZXQ=";

    private final ApplicationContextRunner app = new ApplicationContextRunner().withUserConfiguration(Jwt.class);

    @Test
    @DisplayName("prod refuses to start with the placeholder key, naming JWT_SIGNING_KEY but not the key")
    void prodRefusesThePlaceholder() {
        app.withPropertyValues("spring.profiles.active=prod", "secretmatch.security.jwt.signing-key=" + PLACEHOLDER)
                .run(context -> {
                    assertThat(context).hasFailed();
                    String failure = stackTrace(context.getStartupFailure());
                    assertThat(failure).contains("JWT_SIGNING_KEY").doesNotContain(PLACEHOLDER);
                });
    }

    @Test
    @DisplayName("prod starts with a key of its own")
    void prodAcceptsItsOwnKey() {
        app.withPropertyValues("spring.profiles.active=prod", "secretmatch.security.jwt.signing-key=" + OWN_KEY)
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    @DisplayName("outside prod the placeholder key still works")
    void placeholderWorksOutsideProd() {
        app.withPropertyValues("spring.profiles.active=local", "secretmatch.security.jwt.signing-key=" + PLACEHOLDER)
                .run(context -> assertThat(context).hasNotFailed());
        app.withPropertyValues("secretmatch.security.jwt.signing-key=" + PLACEHOLDER)
                .run(context -> assertThat(context).hasNotFailed());
    }

    private static String stackTrace(Throwable failure) {
        StringWriter out = new StringWriter();
        failure.printStackTrace(new PrintWriter(out));
        return out.toString();
    }

    /** The signing key as the app binds it, and the check that runs on it at startup. */
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(JwtProperties.class)
    @Import(ProductionSigningKeyCheck.class)
    static class Jwt {}
}
