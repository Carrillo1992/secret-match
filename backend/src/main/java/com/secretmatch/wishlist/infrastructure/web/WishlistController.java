package com.secretmatch.wishlist.infrastructure.web;

import com.secretmatch.wishlist.application.MemberWishlists;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups/{groupId}")
@Tag(name = "wishlists")
class WishlistController {

    private final MemberWishlists wishlists;

    WishlistController(MemberWishlists wishlists) {
        this.wishlists = wishlists;
    }

    @GetMapping(path = "/members/{memberId}/wishlist", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "A Member's Wishlist",
            description = "Private: only its owner can read it, and once the Group has a Draw, the owner's Giver"
                    + " too. Anyone else gets a 404, the same as for a Wishlist that does not exist.")
    WishlistResponse wishlist(
            @AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId, @PathVariable UUID memberId) {
        return WishlistResponse.of(wishlists.wishlistOf(groupId, signedIn(accessToken), memberId));
    }

    @PostMapping(path = "/wishes", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a Wish to your own Wishlist in the Group")
    WishResponse addWish(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID groupId,
            @Valid @RequestBody WishRequest request) {
        return WishResponse.of(wishlists.addWish(groupId, signedIn(accessToken), request.toWish()));
    }

    @PutMapping(path = "/wishes/{wishId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Replace one of your Wishes",
            description = "Every field is replaced: one left out is cleared. Only the Wish's owner can.")
    WishResponse editWish(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID groupId,
            @PathVariable UUID wishId,
            @Valid @RequestBody WishRequest request) {
        return WishResponse.of(wishlists.editWish(groupId, signedIn(accessToken), wishId, request.toWish()));
    }

    @DeleteMapping("/wishes/{wishId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete one of your Wishes", description = "Only the Wish's owner can.")
    void deleteWish(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId, @PathVariable UUID wishId) {
        wishlists.deleteWish(groupId, signedIn(accessToken), wishId);
    }

    @PutMapping(path = "/preferences", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Write your own Preferences in the Group",
            description = "Replaces what they said before; blank or left out clears them.")
    PreferencesResponse editPreferences(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID groupId,
            @RequestBody PreferencesRequest request) {
        return PreferencesResponse.of(
                wishlists.editPreferences(groupId, signedIn(accessToken), request.toPreferences()));
    }

    @PostMapping(path = "/dont-list", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an entry to your own Don't List in the Group")
    DontListEntryResponse addDontListEntry(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID groupId,
            @RequestBody DontListEntryRequest request) {
        return DontListEntryResponse.of(wishlists.addDontListEntry(groupId, signedIn(accessToken), request.toEntry()));
    }

    @DeleteMapping("/dont-list/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Remove an entry from your own Don't List",
            description = "Only its owner can; to anyone else it does not exist (404).")
    void deleteDontListEntry(
            @AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId, @PathVariable UUID entryId) {
        wishlists.deleteDontListEntry(groupId, signedIn(accessToken), entryId);
    }

    private static UUID signedIn(Jwt accessToken) {
        return UUID.fromString(accessToken.getSubject());
    }
}
