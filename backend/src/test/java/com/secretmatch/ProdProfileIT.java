package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.notification.application.EmailSender;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
            "CORS_ALLOWED_ORIGIN=http://spa.test",
            "MAIL_FROM_ADDRESS=no-reply@secretmatch.test",
            "APP_BASE_URL=http://spa.test",
            "RESEND_API_KEY=re_placeholder",
            "JWT_SIGNING_KEY=cHJvZC1wcm9maWxlLXRlc3Qta2V5LW5vdC1hLXNlY3JldC0xMjM0"
        })
@AutoConfigureRestTestClient
@ActiveProfiles("prod")
@Import(TestPostgres.class)
class ProdProfileIT {

    @Autowired
    RestTestClient http;

    @Autowired
    EmailSender emailSender;

    @Test
    @DisplayName("sends email through Resend in prod")
    void sendsEmailThroughResend() {
        assertThat(emailSender.getClass().getSimpleName()).isEqualTo("ResendEmailSender");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/swagger-ui.html", "/swagger-ui/index.html"})
    @DisplayName("does not serve Swagger UI in prod")
    void doesNotServeSwaggerUi(String path) {
        http.get().uri(path).exchange().expectStatus().isNotFound();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/actuator/health", "/v3/api-docs"})
    @DisplayName("still serves health and the OpenAPI document in prod")
    void stillServesHealthAndOpenApi(String path) {
        http.get().uri(path).exchange().expectStatus().isOk();
    }

    @Test
    @DisplayName("behind the Heroku router, a client that writes its own X-Forwarded-For entries still hits its limit")
    void spoofedForwardedForDoesNotResetTheLimit() {
        // The Heroku router appends the address of the client it got the connection from.
        for (int i = 0; i < 10; i++) {
            signIn("10.0.0." + i + ", 203.0.113.7").expectStatus().isEqualTo(422);
        }

        signIn("10.0.0.99, 203.0.113.7").expectStatus().isEqualTo(429);
        // Another real client keeps its own limit.
        signIn("203.0.113.7, 198.51.100.9").expectStatus().isEqualTo(422);
    }

    private RestTestClient.ResponseSpec signIn(String forwardedFor) {
        return http.post()
                .uri("/api/v1/sessions")
                .header("X-Forwarded-For", forwardedFor)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", "nobody@example.com", "password", "turrón-y-polvorones"))
                .exchange();
    }
}
