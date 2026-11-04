package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestPostgres.class)
class ApiSkeletonIT {

    /** Matches application-test.yml. */
    private static final String SPA_ORIGIN = "http://spa.test";

    @Autowired
    TestRestTemplate http;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    @DisplayName("reports itself healthy, database included")
    void reportsItselfHealthy() {
        ResponseEntity<String> response = http.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
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
        ResponseEntity<String> response = http.getForEntity("/v3/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"openapi\":\"3.");
    }

    @Test
    @DisplayName("serves Swagger UI outside prod")
    void servesSwaggerUiOutsideProd() {
        ResponseEntity<String> response = http.getForEntity("/swagger-ui/index.html", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/actuator","/actuator/info", "/actuator/env", "/actuator/metrics", "/actuator/flyway"})
    @DisplayName("exposes no actuator endpoint other than health")
    void exposesNoActuatorEndpointOtherThanHealth(String path) {
        ResponseEntity<String> response = http.getForEntity(path, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("lets the SPA origin read the health endpoint")
    void letsSpaOriginReadHealth() {
        ResponseEntity<String> response = preflightHealthFrom(SPA_ORIGIN);

        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(SPA_ORIGIN);
    }

    @Test
    @DisplayName("rejects cross-origin requests from any other origin")
    void rejectsOtherOrigins() {
        ResponseEntity<String> response = preflightHealthFrom("http://evil.test");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }

    private ResponseEntity<String> preflightHealthFrom(String origin) {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin(origin);
        headers.setAccessControlRequestMethod(HttpMethod.GET);
        return http.exchange("/actuator/health", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
    }
}
