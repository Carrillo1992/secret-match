package com.secretmatch.group.infrastructure.web;

import com.secretmatch.group.domain.GroupName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mirrors the domain rules so a mistake is a 400. Whether the Exchange Date is in the future depends on the
 * clock, so only the domain checks it (422).
 */
record CreateGroupRequest(
        @NotBlank @Size(max = GroupName.MAX_LENGTH) String name,

        @NotNull LocalDate exchangeDate,

        @Schema(description = "In euros, to the cent. Leave it out for a Group without a budget.")
        @PositiveOrZero
        @Digits(integer = 6, fraction = 2)
        BigDecimal budget) {}
