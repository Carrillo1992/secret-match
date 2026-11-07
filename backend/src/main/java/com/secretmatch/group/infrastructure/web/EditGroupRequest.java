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
 * All the Group's details, which replace the current ones. Mirrors the domain rules so a mistake is a 400;
 * whether a new Exchange Date is in the future depends on the clock, so only the domain checks it (422).
 */
record EditGroupRequest(
        @NotBlank @Size(max = GroupName.MAX_LENGTH) String name,

        @NotNull LocalDate exchangeDate,

        @Schema(description = "In euros, to the cent. Leave it out to take the budget away.")
        @PositiveOrZero
        @Digits(integer = 6, fraction = 2)
        BigDecimal budget) {}
