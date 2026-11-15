package com.secretmatch.shared.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

class HerokuDatabaseUrlTest {

    @Test
    @DisplayName("in prod, Heroku's postgres:// URL becomes a JDBC URL with SSL required, a username and a password")
    void translatesHerokuUrl() {
        MockEnvironment environment =
                prod("postgres://u1abc:p4ss@ec2-1-2-3-4.eu-west-1.compute.amazonaws.com:5432/d9xyz");

        process(environment);

        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://ec2-1-2-3-4.eu-west-1.compute.amazonaws.com:5432/d9xyz?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("u1abc");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("p4ss");
    }

    @Test
    @DisplayName("URL-encoded characters in the user and password are decoded, and a + stays a +")
    void decodesUserInfo() {
        MockEnvironment environment = prod("postgresql://us%40er:p%3Aa%2Fs%40s+w%25rd@db.example.com/secretmatch");

        process(environment);

        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/secretmatch?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("us@er");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("p:a/s@s+w%rd");
    }

    @Test
    @DisplayName("query parameters are kept, and an explicit sslmode is not overridden")
    void keepsQueryParameters() {
        MockEnvironment withParameter = prod("postgres://u:p@db.example.com:6543/db?connectTimeout=5");
        MockEnvironment withSslMode = prod("postgres://u:p@db.example.com:6543/db?sslmode=verify-full");

        process(withParameter);
        process(withSslMode);

        assertThat(withParameter.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:6543/db?connectTimeout=5&sslmode=require");
        assertThat(withSslMode.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:6543/db?sslmode=verify-full");
    }

    @Test
    @DisplayName("a JDBC DATABASE_URL in prod is left as it is")
    void leavesJdbcUrlAlone() {
        MockEnvironment environment = prod("jdbc:postgresql://localhost:5432/secretmatch");

        process(environment);

        assertThat(environment.getPropertySources().contains(HerokuDatabaseUrl.PROPERTY_SOURCE_NAME))
                .isFalse();
    }

    @Test
    @DisplayName("outside prod, even a postgres:// URL is left as it is")
    void onlyInProd() {
        MockEnvironment environment = new MockEnvironment().withProperty("DATABASE_URL", "postgres://u:p@db/db");
        environment.setActiveProfiles("local");

        process(environment);

        assertThat(environment.getPropertySources().contains(HerokuDatabaseUrl.PROPERTY_SOURCE_NAME))
                .isFalse();
    }

    @Test
    @DisplayName("a malformed URL fails the start without repeating the password")
    void malformedUrlDoesNotLeakThePassword() {
        assertThatThrownBy(() -> process(prod("postgres://user:s3cr3t pass@db.example.com/db")))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .message()
                .doesNotContain("s3cr3t");
        assertThatThrownBy(() -> process(prod("postgres://s3cr3t@db.example.com/db")))
                .isInstanceOf(IllegalStateException.class)
                .message()
                .doesNotContain("s3cr3t");
    }

    @Test
    @DisplayName("runs at startup: with only Heroku's DATABASE_URL, prod gets the whole datasource")
    void runsAtStartup() {
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(NoBeans.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .logStartupInfo(false)
                .profiles("prod")
                .properties("DATABASE_URL=postgres://u1abc:p%40ss@db.example.com:5432/d9xyz")
                .run()) {
            Environment environment = context.getEnvironment();

            assertThat(environment.getProperty("spring.datasource.url"))
                    .isEqualTo("jdbc:postgresql://db.example.com:5432/d9xyz?sslmode=require");
            assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("u1abc");
            assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("p@ss");
        }
    }

    /** Only the configuration files and the environment post-processors run, not the app. */
    static class NoBeans {}

    private static MockEnvironment prod(String databaseUrl) {
        MockEnvironment environment = new MockEnvironment().withProperty("DATABASE_URL", databaseUrl);
        environment.setActiveProfiles("prod");
        return environment;
    }

    private static void process(MockEnvironment environment) {
        new HerokuDatabaseUrl().postProcessEnvironment(environment, new SpringApplication());
    }
}
