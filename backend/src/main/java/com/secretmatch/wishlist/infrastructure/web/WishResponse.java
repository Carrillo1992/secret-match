package com.secretmatch.wishlist.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secretmatch.wishlist.application.StoredWish;
import com.secretmatch.wishlist.domain.Priority;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

/** Optional fields that are not set are left out. */
@JsonInclude(JsonInclude.Include.NON_NULL)
record WishResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Identifies the Wish, to change it.")
        UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,

        @Schema(description = "Always an http or https address.")
        String link,

        @Schema(description = "Approximately, in euros.") BigDecimal price,

        String notes,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Priority priority) {

    static WishResponse of(StoredWish stored) {
        return new WishResponse(
                stored.id(),
                stored.wish().title(),
                stored.wish().link(),
                stored.wish().price(),
                stored.wish().notes(),
                stored.wish().priority());
    }
}
