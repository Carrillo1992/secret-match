package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.domain.DontListEntry;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mirrors the domain's length rule so a mistake is a 400. */
record DontListEntryRequest(
        @Schema(description = "What the Member does not want.") @NotBlank @Size(max = DontListEntry.MAX_LENGTH)
        String text) {

    DontListEntry toEntry() {
        return new DontListEntry(text);
    }
}
