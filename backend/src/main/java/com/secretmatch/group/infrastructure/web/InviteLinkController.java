package com.secretmatch.group.infrastructure.web;

import com.secretmatch.group.application.InviteLinks;
import com.secretmatch.group.domain.MemberId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "invite-links")
class InviteLinkController {

    private final InviteLinks inviteLinks;

    InviteLinkController(InviteLinks inviteLinks) {
        this.inviteLinks = inviteLinks;
    }

    @PostMapping(value = "/api/v1/memberships", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Join a Group through its Invite Link",
            description = "A User who is a Member already just gets the Group back. A code that matches no"
                    + " Group's current Invite Link is a 404 that says nothing about any Group.")
    MembershipResponse join(@AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody JoinGroupRequest request) {
        return new MembershipResponse(
                inviteLinks.join(request.inviteCode(), signedIn(accessToken)).value());
    }

    private static MemberId signedIn(Jwt accessToken) {
        return new MemberId(UUID.fromString(accessToken.getSubject()));
    }
}
