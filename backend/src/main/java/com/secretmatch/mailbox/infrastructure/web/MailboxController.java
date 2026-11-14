package com.secretmatch.mailbox.infrastructure.web;

import com.secretmatch.mailbox.application.MemberMailboxes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** A Mailbox is addressed only by its opaque id, never by a Member's (ADR 0001). */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "mailbox")
class MailboxController {

    private final MemberMailboxes mailboxes;

    MailboxController(MemberMailboxes mailboxes) {
        this.mailboxes = mailboxes;
    }

    @GetMapping(path = "/groups/{groupId}/mailboxes", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "The signed-in Member's Mailboxes in the Group",
            description = "None before the Draw. After it, two: the one with their Receiver (side GIVER) first,"
                    + " then the one with their Giver (side RECEIVER), who is never named.")
    List<MailboxResponse> myMailboxes(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        return mailboxes.mailboxesOf(groupId, signedIn(accessToken)).stream()
                .map(MailboxResponse::of)
                .toList();
    }

    @GetMapping(path = "/mailboxes/{mailboxId}/messages", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "A Mailbox's Messages, oldest first",
            description = "Only its Giver and Receiver can read it; anyone else, the Admin included, gets a 404.")
    List<MessageResponse> mailboxMessages(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID mailboxId) {
        return mailboxes.messagesIn(mailboxId, signedIn(accessToken)).stream()
                .map(MessageResponse::of)
                .toList();
    }

    @PostMapping(path = "/mailboxes/{mailboxId}/messages", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Send a Message in a Mailbox",
            description = "Text only, 1 to 1000 characters, not blank. Only its Giver and Receiver can; anyone"
                    + " else, the Admin included, gets a 404.")
    MessageResponse sendMessage(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID mailboxId,
            @RequestBody SendMessageRequest request) {
        return MessageResponse.of(mailboxes.send(mailboxId, signedIn(accessToken), request.text()));
    }

    private static UUID signedIn(Jwt accessToken) {
        return UUID.fromString(accessToken.getSubject());
    }
}
