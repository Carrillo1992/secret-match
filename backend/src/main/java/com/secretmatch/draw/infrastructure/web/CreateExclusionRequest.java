package com.secretmatch.draw.infrastructure.web;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Whether both are different Members of the Group depends on the Group, so only the use case checks it (422). */
record CreateExclusionRequest(
        @ArraySchema(
                arraySchema =
                        @Schema(
                                requiredMode = Schema.RequiredMode.REQUIRED,
                                description = "The ids of the two Members, in any order."),
                minItems = 2,
                maxItems = 2)
        @NotNull
        @Size(min = 2, max = 2)
        List<@NotNull UUID> memberIds) {}
