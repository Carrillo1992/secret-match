package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.notification.application.EmailSender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
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
}
