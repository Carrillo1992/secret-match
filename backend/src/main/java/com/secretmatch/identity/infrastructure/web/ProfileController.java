package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.ChangeDisplayNameCommand;
import com.secretmatch.identity.application.ChangePasswordCommand;
import com.secretmatch.identity.application.CurrentUser;
import com.secretmatch.identity.application.Profile;
import com.secretmatch.identity.infrastructure.security.AccessTokenClaims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in User's own profile. */
@RestController
@RequestMapping("/api/v1/users/me")
@Tag(name = "profile")
class ProfileController {

    private final Profile profile;

    ProfileController(Profile profile) {
        this.profile = profile;
    }

    @PutMapping(value = "/display-name", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Change the signed-in User's display name")
    CurrentUserResponse changeDisplayName(
            @AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody DisplayNameRequest request) {
        CurrentUser user = profile.changeDisplayName(
                AccessTokenClaims.userId(accessToken), new ChangeDisplayNameCommand(request.displayName()));
        return CurrentUserResponse.of(user);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Change the signed-in User's password, or set a first one",
            description = "Needs the current password, if the User has one. Ends the User's Sessions on every"
                    + " other device.")
    void changePassword(@AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody ChangePasswordRequest request) {
        profile.changePassword(
                AccessTokenClaims.userId(accessToken),
                AccessTokenClaims.sessionId(accessToken),
                new ChangePasswordCommand(request.currentPassword(), request.newPassword()));
    }
}
