package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.application.ForgottenPassword;
import com.secretmatch.identity.application.ResetPasswordCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** A User who forgot their password sets a new one through an emailed link. */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "password-reset")
class PasswordResetController {

    private final ForgottenPassword forgottenPassword;

    PasswordResetController(ForgottenPassword forgottenPassword) {
        this.forgottenPassword = forgottenPassword;
    }

    @PostMapping("/password-reset-emails")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Email a link to set a new password",
            description = "Sent only if the email has a User; it replaces any earlier link. Answers the same"
                    + " either way.")
    void sendResetLink(@Valid @RequestBody PasswordResetEmailRequest request) {
        forgottenPassword.sendResetLink(request.email());
    }

    @PostMapping("/password-resets")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Set a new password with the token from a reset link",
            description = "Ends every Session of the User.")
    void resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        forgottenPassword.resetPassword(new ResetPasswordCommand(request.token(), request.newPassword()));
    }
}
