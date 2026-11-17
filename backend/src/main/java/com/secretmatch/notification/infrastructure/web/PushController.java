package com.secretmatch.notification.infrastructure.web;

import com.secretmatch.notification.application.MyPushSubscriptions;
import com.secretmatch.notification.domain.PushOffException;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Notifications on the signed-in User's devices, through the browsers' Web Push (#119). */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "push")
class PushController {

    private final MyPushSubscriptions subscriptions;

    PushController(MyPushSubscriptions subscriptions) {
        this.subscriptions = subscriptions;
    }

    @GetMapping(path = "/push/public-key", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "The key browsers subscribe to notifications with",
            description = "Needs no Session. 404 push-off when this API sends no notifications.")
    PushPublicKeyResponse publicKey() {
        return subscriptions.publicKey().map(PushPublicKeyResponse::new).orElseThrow(PushOffException::new);
    }

    @PutMapping("/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Turn notifications on for this device",
            description = "The browser's push subscription as its Push API gives it. Sending one that is already"
                    + " kept, also for another User, makes it the signed-in User's. 422 invalid-push-subscription"
                    + " unless the endpoint is a browser's push service, over HTTPS.")
    void subscribe(@AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody PushSubscriptionRequest request) {
        subscriptions.subscribe(
                signedIn(accessToken),
                request.endpoint(),
                request.keys().p256dh(),
                request.keys().auth());
    }

    @DeleteMapping("/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Turn notifications off for this device",
            description = "Forgets the subscription with this endpoint if it is the signed-in User's; anyone"
                    + " else's stays.")
    void unsubscribe(@AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody PushUnsubscriptionRequest request) {
        subscriptions.unsubscribe(signedIn(accessToken), request.endpoint());
    }

    private static UUID signedIn(Jwt accessToken) {
        return UUID.fromString(accessToken.getSubject());
    }
}
