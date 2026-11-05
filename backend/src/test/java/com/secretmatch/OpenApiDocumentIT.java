package com.secretmatch;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * The committed {@code openapi.json} is the contract the frontend generates its API client from
 * ({@code npm run api:generate}), so it must always match what the API actually serves.
 *
 * <p>After an API change, refresh it with {@code ./mvnw verify -Dopenapi.snapshot.update=true}
 * and commit the result together with the regenerated frontend client.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import(TestPostgres.class)
class OpenApiDocumentIT {

    private static final Path SNAPSHOT = Path.of("openapi.json");
    private static final String UPDATE_PROPERTY = "openapi.snapshot.update";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    private JsonNode served;

    @BeforeEach
    void fetchServedDocument() {
        String body = http.get()
                .uri("/v3/api-docs")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();
        ObjectNode document = (ObjectNode) JSON.readTree(body);
        // The server URL carries the random test port; the client takes its base URL from config.json.
        document.remove("servers");
        served = document;
    }

    @Test
    @DisplayName("documents the health endpoint so the SPA can call it through the generated client")
    void documentsHealthEndpoint() {
        assertThat(served.at("/paths/~1actuator~1health/get").isMissingNode())
                .as("GET /actuator/health in the OpenAPI document")
                .isFalse();
    }

    @Test
    @DisplayName("describes the health response as JSON with a required status")
    void describesHealthResponse() {
        JsonNode content = served.at("/paths/~1actuator~1health/get/responses/200/content");
        assertThat(content.propertyNames()).containsExactly("application/json");

        String ref = content.at("/application~1json/schema/$ref").asString();
        JsonNode schema = served.at("/components/schemas/" + ref.substring(ref.lastIndexOf('/') + 1));
        assertThat(schema.at("/properties/status/type").asString()).isEqualTo("string");
        assertThat(schema.at("/required").values())
                .extracting(JsonNode::asString)
                .containsExactly("status");
    }

    @Test
    @DisplayName("matches the committed openapi.json snapshot")
    void matchesCommittedSnapshot() throws IOException {
        if (Boolean.getBoolean(UPDATE_PROPERTY)) {
            Files.writeString(SNAPSHOT, JSON.writerWithDefaultPrettyPrinter().writeValueAsString(served) + "\n");
        }

        assertThat(Files.exists(SNAPSHOT))
                .as("%s exists; create it with -D%s=true", SNAPSHOT.toAbsolutePath(), UPDATE_PROPERTY)
                .isTrue();
        assertThat(JSON.readTree(Files.readString(SNAPSHOT)))
                .as("%s is stale; refresh it with -D%s=true", SNAPSHOT, UPDATE_PROPERTY)
                .isEqualTo(served);
    }
}
