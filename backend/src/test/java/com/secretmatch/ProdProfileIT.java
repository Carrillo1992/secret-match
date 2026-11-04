package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = "CORS_ALLOWED_ORIGIN=http://spa.test")
@ActiveProfiles("prod")
@Import(TestPostgres.class)
class ProdProfileIT {

    @Autowired
    TestRestTemplate http;

    @ParameterizedTest
    @ValueSource(strings = {"/swagger-ui.html", "/swagger-ui/index.html"})
    @DisplayName("does not serve Swagger UI in prod")
    void doesNotServeSwaggerUi(String path) {
        assertThat(http.getForEntity(path, String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/actuator/health", "/v3/api-docs"})
    @DisplayName("still serves health and the OpenAPI document in prod")
    void stillServesHealthAndOpenApi(String path) {
        assertThat(http.getForEntity(path, String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
