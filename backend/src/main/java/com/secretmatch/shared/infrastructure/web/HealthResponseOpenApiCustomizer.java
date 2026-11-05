package com.secretmatch.shared.infrastructure.web;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.stereotype.Component;

/**
 * Shapes the OpenAPI document, the contract the SPA generates its API client from.
 *
 * <p>springdoc documents Actuator's health response as an untyped object under three media types.
 * The SPA only reads its {@code status}, so the document says exactly that.
 */
@Component
class HealthResponseOpenApiCustomizer implements OpenApiCustomizer {

    private static final String HEALTH_PATH = "/actuator/health";
    private static final String HEALTH_SCHEMA = "Health";

    @Override
    public void customise(OpenAPI openApi) {
        okResponseOfHealthCheck(openApi)
                .setContent(new Content()
                        .addMediaType(
                                org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
                                new MediaType().schema(new Schema<>().$ref(HEALTH_SCHEMA))));
        openApi.getComponents()
                .addSchemas(
                        HEALTH_SCHEMA,
                        new ObjectSchema()
                                .description(
                                        "Overall API health as reported by Actuator. Only status is part of the contract.")
                                .addProperty(
                                        "status",
                                        new StringSchema().description("UP when the API and its database work."))
                                .addRequiredItem("status"));
    }

    private static ApiResponse okResponseOfHealthCheck(OpenAPI openApi) {
        PathItem path = openApi.getPaths().get(HEALTH_PATH);
        Operation get = path == null ? null : path.getGet();
        ApiResponse ok = get == null ? null : get.getResponses().get("200");
        if (ok == null) {
            throw new IllegalStateException("GET " + HEALTH_PATH + " 200 is missing from the OpenAPI document");
        }
        return ok;
    }
}
