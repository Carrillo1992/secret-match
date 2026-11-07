package com.secretmatch.draw.infrastructure.web;

import com.secretmatch.draw.application.ExclusionDetails;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

record ExclusionResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Identifies the Exclusion, to delete it.")
        UUID id,

        @ArraySchema(
                arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Its two Members."),
                minItems = 2,
                maxItems = 2)
        List<ExcludedMemberResponse> members) {

    static ExclusionResponse of(ExclusionDetails exclusion) {
        return new ExclusionResponse(
                exclusion.id(),
                exclusion.members().stream()
                        .map(member -> new ExcludedMemberResponse(member.id(), member.displayName()))
                        .toList());
    }

    /** Not {@code MemberResponse}: the OpenAPI document names schemas by simple name, and a Group's has that one. */
    record ExcludedMemberResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String displayName) {}
}
