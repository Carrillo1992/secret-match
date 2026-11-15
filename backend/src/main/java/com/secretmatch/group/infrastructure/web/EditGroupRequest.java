package com.secretmatch.group.infrastructure.web;

import com.secretmatch.group.domain.Currency;
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

        @Schema(description = "In the Group's currency, to the cent. Leave it out to take the budget away.")
        @PositiveOrZero
        @Digits(integer = 6, fraction = 2)
        BigDecimal budget,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description =
                        "The money the budget and the Wish prices are in. Changing it relabels them, it never converts them; it can change after the Draw.")
        @NotNull
        Currency currency,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description =
                        "IANA time zone id, e.g. Europe/Madrid: the day each Mailbox Message shows is cut in" + " it.",
                example = "Europe/Madrid")
        @NotBlank
        @Size(max = 64)
        String timeZone) {}
