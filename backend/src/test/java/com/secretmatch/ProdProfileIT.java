package com.secretmatch;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = "CORS_ALLOWED_ORIGIN=http://spa.test")
@AutoConfigureRestTestClient
@ActiveProfiles("prod")
@Import(TestPostgres.class)
class ProdProfileIT {

    @Autowired
    RestTestClient http;

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
