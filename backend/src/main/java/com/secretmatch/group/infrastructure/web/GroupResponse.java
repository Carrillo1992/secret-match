package com.secretmatch.group.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secretmatch.group.application.GroupDetails;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

record GroupResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate exchangeDate,

        @Schema(description = "In euros; absent when the Group has no budget.")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        BigDecimal budget,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The Admin first.")
        List<MemberResponse> members,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The code of the Group's Invite Link: the SPA builds the link from it.")
        String inviteCode,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whether the signed-in User is its Admin.")
        boolean admin) {

    static GroupResponse of(GroupDetails group) {
        return new GroupResponse(
                group.id(),
                group.name(),
                group.exchangeDate(),
                group.budget(),
                group.members().stream()
                        .map(member -> new MemberResponse(member.id(), member.displayName(), member.admin()))
                        .toList(),
                group.inviteCode(),
                group.admin());
    }

    record MemberResponse(
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "Identifies the Member in the Group, e.g. to remove them.")
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String displayName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            boolean admin) {}
}
