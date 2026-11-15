package com.secretmatch.shared.infrastructure.persistence;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Lets {@code prod} connect with the {@code DATABASE_URL} Heroku Postgres sets, which has the form
 * {@code postgres://user:password@host:port/database} rather than a JDBC URL (#108). It becomes
 * {@code spring.datasource.url} (with {@code sslmode=require}: Heroku Postgres only accepts SSL),
 * {@code spring.datasource.username} and {@code spring.datasource.password}, read at every start. Heroku restarts
 * the dyno after rotating the credentials, so the new ones are picked up with nothing to keep in sync.
 *
 * <p>Any other profile, and a {@code DATABASE_URL} already in JDBC form, are left alone: the local stack and the
 * tests keep {@code DATABASE_URL} / {@code DATABASE_USERNAME} / {@code DATABASE_PASSWORD} as they are.
 *
 * <p>The URL carries the password, so no error here ever includes it.
 */
public class HerokuDatabaseUrl implements EnvironmentPostProcessor {

    static final String PROPERTY_SOURCE_NAME = "herokuDatabaseUrl";

    private static final String INVALID = "DATABASE_URL is not a valid postgres://user:password@host:port/database URL";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!environment.matchesProfiles("prod")) {
            return;
        }
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null
                || !(databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
            return;
        }
        environment
                .getPropertySources()
                .addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, datasourceProperties(databaseUrl)));
    }

    private static Map<String, Object> datasourceProperties(String databaseUrl) {
        URI uri = parse(databaseUrl);
        String userInfo = uri.getRawUserInfo();
        String path = uri.getRawPath();
        if (uri.getHost() == null || userInfo == null || !userInfo.contains(":") || path == null || path.length() < 2) {
            throw new IllegalStateException(INVALID);
        }
        int colon = userInfo.indexOf(':');
        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String query = uri.getRawQuery();
        String parameters = query == null ? "sslmode=require" : withSslRequired(query);
        return Map.of(
                "spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + ":" + port + path + "?" + parameters,
                "spring.datasource.username", decode(userInfo.substring(0, colon)),
                "spring.datasource.password", decode(userInfo.substring(colon + 1)));
    }

    private static URI parse(String databaseUrl) {
        try {
            return new URI(databaseUrl);
        } catch (URISyntaxException e) {
            // Not chained: the exception's message repeats the URL, password included.
            throw new IllegalStateException(INVALID);
        }
    }

    private static String withSslRequired(String query) {
        return query.contains("sslmode=") ? query : query + "&sslmode=require";
    }

    /** Percent-decoding only: in the user info a {@code +} is a plus, not a space. */
    private static String decode(String raw) {
        return URLDecoder.decode(raw.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
