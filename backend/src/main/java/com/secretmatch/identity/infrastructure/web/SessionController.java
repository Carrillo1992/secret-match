package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.AccessToken;
import com.secretmatch.identity.application.CurrentUser;
import com.secretmatch.identity.application.RefreshOutcome;
import com.secretmatch.identity.application.Sessions;
import com.secretmatch.identity.application.SignInCommand;
import com.secretmatch.identity.application.SignedIn;
import com.secretmatch.identity.domain.RefreshToken;
import com.secretmatch.identity.infrastructure.security.AccessTokenClaims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sessions as docs/architecture.md §2.4 lays them out: the access token travels in the response body, the
 * refresh token only in an {@code HttpOnly} cookie that the browser sends to the session endpoints alone.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "sessions")
class SessionController {

    static final String REFRESH_COOKIE = "refresh_token";
    static final String REFRESH_COOKIE_PATH = "/api/v1/sessions";

    private final Sessions sessions;

    SessionController(Sessions sessions) {
        this.sessions = sessions;
    }

    @PostMapping(value = "/sessions", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Sign in with email and password",
            description = "Sets the refresh token cookie. A wrong email or password gets the same answer.")
    ResponseEntity<AccessTokenResponse> signIn(@Valid @RequestBody SignInRequest request) {
        return signedIn(sessions.signIn(new SignInCommand(request.email(), request.password())));
    }

    @PostMapping(value = "/sessions/refresh", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Swap the refresh token cookie for a new access token",
            description = "Rotates the cookie. Reusing an old cookie ends the whole session.")
    ResponseEntity<AccessTokenResponse> refresh(
            @Parameter(hidden = true) @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return switch (sessions.refresh(refreshToken)) {
            case RefreshOutcome.Rotated rotated -> signedIn(rotated.session());
            case RefreshOutcome.AlreadyRotated alreadyRotated -> ResponseEntity.ok(body(alreadyRotated.accessToken()));
        };
    }

    @DeleteMapping("/sessions/current")
    @Operation(summary = "Sign out", description = "Ends the session of the refresh token cookie and clears it.")
    ResponseEntity<Void> signOut(
            @Parameter(hidden = true) @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        sessions.signOut(refreshToken);
        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO).toString())
                .build();
    }

    @GetMapping(value = "/users/me", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "The signed-in User")
    CurrentUserResponse currentUser(@AuthenticationPrincipal Jwt accessToken) {
        CurrentUser user = sessions.currentUser(AccessTokenClaims.userId(accessToken));
        return CurrentUserResponse.of(user);
    }

    private static ResponseEntity<AccessTokenResponse> signedIn(SignedIn signedIn) {
        String cookie = refreshCookie(signedIn.refreshToken().value(), RefreshToken.VALIDITY)
                .toString();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie).body(body(signedIn.accessToken()));
    }

    private static AccessTokenResponse body(AccessToken accessToken) {
        return new AccessTokenResponse(accessToken.value(), accessToken.expiresAt());
    }

    /**
     * {@code SameSite=None} because the SPA and the API live on different sites on the free hosts; the
     * path keeps the cookie away from every request but the session endpoints.
     */
    private static ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
