package com.secretmatch.identity.application;

/**
 * The passwords typed into the profile's password form. {@code currentPassword} is {@code null} for a User
 * who has no password yet.
 */
public record ChangePasswordCommand(String currentPassword, String newPassword) {

    /** Leaves out both passwords. */
    @Override
    public String toString() {
        return "ChangePasswordCommand[redacted]";
    }
}
