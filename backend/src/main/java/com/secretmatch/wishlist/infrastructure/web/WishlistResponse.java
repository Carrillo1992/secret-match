package com.secretmatch.wishlist.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secretmatch.wishlist.application.WishlistDetails;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

/** Preferences are left out when the Member wrote none. */
@JsonInclude(JsonInclude.Include.NON_NULL)
record WishlistResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) WishlistOwnerResponse owner,

        @ArraySchema(
                arraySchema =
                        @Schema(
                                requiredMode = Schema.RequiredMode.REQUIRED,
                                description = "High priority first, the oldest first within a priority."))
        List<WishResponse> wishes,

        @Schema(description = "Tastes, sizes and hobbies. Left out when there are none.")
        String preferences,

        @ArraySchema(
                arraySchema =
                        @Schema(
                                requiredMode = Schema.RequiredMode.REQUIRED,
                                description = "What the Member does not want to receive, oldest first."))
        List<DontListEntryResponse> dontList) {

    static WishlistResponse of(WishlistDetails wishlist) {
        WishlistDetails.Owner owner = wishlist.owner();
        return new WishlistResponse(
                new WishlistOwnerResponse(owner.id(), owner.displayName(), owner.you()),
                wishlist.wishes().stream().map(WishResponse::of).toList(),
                wishlist.preferences().text(),
                wishlist.dontList().stream().map(DontListEntryResponse::of).toList());
    }

    record WishlistOwnerResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            UUID id,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String displayName,

            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "Whether it is the signed-in Member's own Wishlist, which only they can change.")
            boolean you) {}
}
