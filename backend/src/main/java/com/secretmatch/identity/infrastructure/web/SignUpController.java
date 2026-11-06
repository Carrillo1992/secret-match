package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.EmailSignUp;
import com.secretmatch.identity.application.SignUpCommand;
import com.secretmatch.identity.domain.EmailLinkToken;
import com.secretmatch.identity.domain.SignUpId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "sign-up")
class SignUpController {

    private final EmailSignUp emailSignUp;

    SignUpController(EmailSignUp emailSignUp) {
        this.emailSignUp = emailSignUp;
    }

    @PostMapping(value = "/sign-ups", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Sign up with email and password",
            description = "Emails a verification link. Answers the same whether or not the email has an account.")
    SignUpResponse signUp(@Valid @RequestBody SignUpRequest request) {
        SignUpId id = emailSignUp.signUp(new SignUpCommand(request.email(), request.displayName(), request.password()));
        return new SignUpResponse(id.value());
    }

    @PostMapping("/sign-ups/{signUpId}/verification-emails")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Send a new verification link for a sign-up",
            description = "Sent only while the sign-up waits for verification. Answers the same either way.")
    void sendNewLinkForSignUp(@PathVariable UUID signUpId) {
        emailSignUp.sendNewLink(new SignUpId(signUpId));
    }

    @PostMapping("/verification-emails")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Send a new verification link in place of an old one",
            description = "Sent only while the link's sign-up waits for verification. Answers the same either way.")
    void sendNewLinkInPlaceOf(@Valid @RequestBody NewLinkRequest request) {
        emailSignUp.sendNewLink(EmailLinkToken.of(request.token()));
    }

    @PostMapping("/email-verifications")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Verify an email with the token from its verification link, creating the User")
    void verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        emailSignUp.verifyEmail(EmailLinkToken.of(request.token()));
    }
}
