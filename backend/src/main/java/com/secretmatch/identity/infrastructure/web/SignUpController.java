package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.EmailSignUp;
import com.secretmatch.identity.application.SignUpCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

    @PostMapping("/sign-ups")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Sign up with email and password",
            description = "Emails a verification link. Answers the same whether or not the email has an account.")
    void signUp(@Valid @RequestBody SignUpRequest request) {
        emailSignUp.signUp(new SignUpCommand(request.email(), request.displayName(), request.password()));
    }

    @PostMapping("/email-verifications")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Verify an email with the token from its verification link")
    void verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        emailSignUp.verifyEmail(request.token());
    }

    @PostMapping("/verification-emails")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Send a new verification link",
            description = "Sent only to a User who has not verified their email yet. Answers the same either way.")
    void sendVerificationEmail(@Valid @RequestBody VerificationEmailRequest request) {
        emailSignUp.sendVerificationEmail(request.email());
    }
}
