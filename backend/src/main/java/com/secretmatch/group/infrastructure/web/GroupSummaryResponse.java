package com.secretmatch.group.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secretmatch.group.application.GroupSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

record GroupSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate exchangeDate,

        @Schema(description = "In euros; absent when the Group has no budget.")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        BigDecimal budget,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int memberCount,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whether the signed-in User is its Admin.")
        boolean admin) {

    static GroupSummaryResponse of(GroupSummary group) {
        return new GroupSummaryResponse(
                group.id(), group.name(), group.exchangeDate(), group.budget(), group.memberCount(), group.admin());
    }
}
