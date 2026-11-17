package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.logging.LogLevel;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #101: with the {@code prod} profile, a stray DEBUG or TRACE setting on a parent logger (root, all of Spring,
 * all of Apache, so Spring Security, Spring web and the embedded Tomcat would log at that level too) still prints no
 * password and no token. Without the levels pinned in application-prod.yml, Tomcat prints the raw request (the
 * {@code Authorization} header, the refresh cookie, the sign-in body) and Spring's HTTP client prints request bodies.
 */
@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
            "logging.level.root=DEBUG",
            "logging.level.org.springframework=TRACE",
            "logging.level.org.apache=TRACE",
            "secretmatch.mail.resend.api-key=unused",
            // RFC 8291's example key pair: public, not a secret.
            "secretmatch.push.vapid.public-key="
                    + "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
            "secretmatch.push.vapid.private-key=yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"
        })
@AutoConfigureRestTestClient
@ActiveProfiles({"test", "prod"})
@Import({TestPostgres.class, RecordingEmailSender.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class ProductionLoggingIT {

    private static final String PASSWORD = "mazapán-de-toledo";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final Pattern REFRESH_COOKIE = Pattern.compile("refresh_token=([^;]*)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    /**
     * Logging levels outlive this test's application context: put back what the other integration tests expect,
     * so they do not run at DEBUG or TRACE with prod's pinned levels.
     */
    @AfterAll
    static void restoreLogLevels() {
        LoggingSystem logging = LoggingSystem.get(ProductionLoggingIT.class.getClassLoader());
        logging.setLogLevel(LoggingSystem.ROOT_LOGGER_NAME, LogLevel.INFO);
        Stream.of(
                        "org.springframework",
                        "org.apache",
                        "org.springframework.security",
                        "org.springframework.web",
                        "org.apache.coyote",
                        "org.apache.tomcat",
                        "org.apache.catalina")
                .forEach(logger -> logging.setLogLevel(logger, null));
    }

    @Test
    @DisplayName("signing in, refreshing and calling the API with DEBUG logging prints no password or token")
    void noTokensInDebugLogs(CapturedOutput output) {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        verifiedUser(email);

        Session first = signedIn(post("/api/v1/sessions", Map.of("email", email, "password", PASSWORD)));
        Session second = signedIn(http.post()
                .uri("/api/v1/sessions/refresh")
                .cookie("refresh_token", first.refreshToken())
                .exchange());
        http.get()
                .uri("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + second.accessToken())
                .exchange()
                .expectStatus()
                .isOk();

        List<String> secrets = List.of(
                PASSWORD, first.accessToken(), first.refreshToken(), second.accessToken(), second.refreshToken());
        assertThat(secrets).allSatisfy(secret -> assertThat(output.getAll()).doesNotContain(secret));
    }

    private record Session(String accessToken, String refreshToken) {}

    private void verifiedUser(String email) {
        post("/api/v1/sign-ups", Map.of("email", email, "displayName", "Ana", "password", PASSWORD, "language", "es"))
                .expectStatus()
                .isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(email).getLast().text());
        assertThat(matcher.find()).isTrue();
        post("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private static Session signedIn(RestTestClient.ResponseSpec response) {
        EntityExchangeResult<String> result =
                response.expectStatus().isOk().expectBody(String.class).returnResult();
        String accessToken =
                JSON.readTree(result.getResponseBody()).get("accessToken").asString();
        Matcher cookie = REFRESH_COOKIE.matcher(
                String.valueOf(result.getResponseHeaders().getFirst(HttpHeaders.SET_COOKIE)));
        assertThat(cookie.find()).as("refresh_token cookie").isTrue();
        return new Session(accessToken, cookie.group(1));
    }
}
