package com.secretmatch.identity.infrastructure.ratelimit;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.http.server.PathContainer;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/** Documents the 429 of every throttled POST, from the same paths the throttles are registered for. */
class TooManyRequestsOpenApiCustomizer implements OpenApiCustomizer {

    private static final String PROBLEM_SCHEMA = "Problem";

    private final List<PathPattern> throttledPaths;

    TooManyRequestsOpenApiCustomizer(List<String> throttledPaths) {
        this.throttledPaths = throttledPaths.stream()
                .map(PathPatternParser.defaultInstance::parse)
                .toList();
    }

    @Override
    public void customise(OpenAPI openApi) {
        openApi.getPaths().forEach((path, item) -> {
            Operation post = item.getPost();
            if (post != null && isThrottled(path)) {
                post.getResponses().addApiResponse("429", tooManyRequests());
            }
        });
        openApi.getComponents().addSchemas(PROBLEM_SCHEMA, problem());
    }

    private boolean isThrottled(String path) {
        PathContainer container = PathContainer.parsePath(path);
        return throttledPaths.stream().anyMatch(pattern -> pattern.matches(container));
    }

    private static ApiResponse tooManyRequests() {
        return new ApiResponse()
                .description("Too many requests from this client. Try again after Retry-After seconds.")
                .addHeaderObject(
                        "Retry-After",
                        new Header()
                                .description("Seconds to wait before trying again.")
                                .schema(new IntegerSchema()))
                .content(new Content()
                        .addMediaType(
                                org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                                new MediaType().schema(new Schema<>().$ref(PROBLEM_SCHEMA))));
    }

    private static Schema<?> problem() {
        return new ObjectSchema()
                .description("An RFC 9457 problem.")
                .addProperty("type", new StringSchema())
                .addProperty("title", new StringSchema())
                .addProperty("status", new IntegerSchema())
                .addProperty("detail", new StringSchema())
                .addProperty("instance", new StringSchema());
    }
}
