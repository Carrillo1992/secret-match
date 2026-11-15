package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

/** The port comes from application.yml: Heroku's $PORT when it is set, 8080 otherwise (#108). */
class ServerPortTest {

    @Test
    @DisplayName("listens on $PORT when it is set")
    void listensOnPort() {
        assertThat(serverPort("PORT=9000")).isEqualTo("9000");
    }

    @Test
    @DisplayName("listens on 8080 without $PORT")
    void defaultsTo8080() {
        assertThat(serverPort()).isEqualTo("8080");
    }

    /** Loads only the configuration files, not the app, and reads the resolved server.port. */
    private static String serverPort(String... properties) {
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(NoBeans.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .logStartupInfo(false)
                .properties(properties)
                .run()) {
            return context.getEnvironment().getProperty("server.port");
        }
    }

    static class NoBeans {}
}
