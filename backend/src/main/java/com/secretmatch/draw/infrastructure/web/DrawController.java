package com.secretmatch.draw.infrastructure.web;

import com.secretmatch.draw.application.GroupDraw;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** There is deliberately no endpoint that lists a Draw's Assignments or names anyone's Giver (ADR 0001). */
@RestController
@RequestMapping("/api/v1/groups/{groupId}/draw")
@Tag(name = "draw")
class DrawController {

    private final GroupDraw draw;

    DrawController(GroupDraw draw) {
        this.draw = draw;
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Run the Group's Draw",
            description = "Only the Admin can, once, with at least 4 Members. Every Member is emailed. The answer"
                    + " is the Draw as the Admin sees it: their own Receiver.")
    ResponseEntity<DrawResponse> runDraw(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        DrawResponse drawn = DrawResponse.of(draw.run(groupId, signedIn(accessToken)));
        return ResponseEntity.created(URI.create("/api/v1/groups/" + groupId + "/draw"))
                .body(drawn);
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "The Group's Draw as the signed-in Member sees it",
            description = "Only their own Receiver. A 404 until the Draw is made.")
    DrawResponse draw(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        return DrawResponse.of(draw.myReceiver(groupId, signedIn(accessToken)));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Cancel the Group's Draw",
            description = "Only the Admin can, until the Group is finished. Every Assignment is deleted and the"
                    + " Group can be joined, left and drawn again. Every Member is emailed.")
    void cancelDraw(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        draw.cancel(groupId, signedIn(accessToken));
    }

    private static UUID signedIn(Jwt accessToken) {
        return UUID.fromString(accessToken.getSubject());
    }
}
