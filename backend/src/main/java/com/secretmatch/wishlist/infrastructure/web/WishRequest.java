package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.domain.Priority;
import com.secretmatch.wishlist.domain.Wish;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Mirrors the domain's length and price rules so a mistake is a 400. Whether the link is an http or https
 * address only the domain checks (422).
 */
record WishRequest(
        @NotBlank @Size(max = Wish.TITLE_MAX_LENGTH) String title,

        @Schema(description = "An http or https address. Leave it out for none.") @Size(max = Wish.LINK_MAX_LENGTH)
        String link,

        @Schema(description = "Approximately, in euros, to the cent. Leave it out for none.")
        @PositiveOrZero
        @Digits(integer = 6, fraction = 2)
        BigDecimal price,

        @Size(max = Wish.NOTES_MAX_LENGTH) String notes,

        @Schema(description = "MEDIUM when left out.") Priority priority) {

    Wish toWish() {
        return new Wish(title, link, price, notes, priority);
    }
}
