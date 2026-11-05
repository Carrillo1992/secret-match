package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(TestPostgres.class)
class ApiSkeletonIT {

    /** Matches application-test.yml. */
    private static final String SPA_ORIGIN = "http://spa.test";

    @Autowired
    RestTestClient http;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    Clock clock;

    @Test
    @DisplayName("reports itself healthy, database included")
    void reportsItselfHealthy() {
        http.get()
                .uri("/actuator/health")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .value(body -> assertThat(body).contains("\"status\":\"UP\""));
    }

    @Test
    @DisplayName("applies the baseline migration on startup")
    void appliesBaselineMigrationOnStartup() {
        List<String> applied = jdbc.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank", String.class);

        assertThat(applied).startsWith("1");
    }

    @Test
    @DisplayName("serves the OpenAPI document")
    void servesOpenApiDocument() {
        http.get()
                .uri("/v3/api-docs")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .value(body -> assertThat(body).contains("\"openapi\":\"3."));
    }

    @Test
    @DisplayName("serves Swagger UI outside prod")
    void servesSwaggerUiOutsideProd() {
        http.get().uri("/swagger-ui/index.html").exchange().expectStatus().isOk();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/actuator", "/actuator/info", "/actuator/env", "/actuator/metrics", "/actuator/flyway"})
    @DisplayName("exposes no actuator endpoint other than health")
    void exposesNoActuatorEndpointOtherThanHealth(String path) {
        http.get().uri(path).exchange().expectStatus().isNotFound();
    }

    @Test
    @DisplayName("lets the SPA origin read the health endpoint")
    void letsSpaOriginReadHealth() {
        preflightHealthFrom(SPA_ORIGIN).expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, SPA_ORIGIN);
    }

    @Test
    @DisplayName("rejects cross-origin requests from any other origin")
    void rejectsOtherOrigins() {
        preflightHealthFrom("http://evil.test")
                .expectStatus()
                .isForbidden()
                .expectHeader()
                .doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
    }

    @Test
    @DisplayName("answers an unknown route with an RFC 9457 problem")
    void answersUnknownRouteWithProblem() {
        http.get()
                .uri("/api/v1/no-such-route")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectHeader()
                .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody()
                .jsonPath("$.status")
                .isEqualTo(404)
                .jsonPath("$.title")
                .isEqualTo("Not Found");
    }

    @Test
    @DisplayName("provides a UTC clock for injection")
    void providesUtcClock() {
        assertThat(clock.getZone()).isEqualTo(ZoneOffset.UTC);
    }

    private RestTestClient.ResponseSpec preflightHealthFrom(String origin) {
        return http.options()
                .uri("/actuator/health")
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .exchange();
    }
}
