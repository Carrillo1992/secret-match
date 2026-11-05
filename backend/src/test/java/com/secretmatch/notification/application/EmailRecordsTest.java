package com.secretmatch.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Emails carry personal data, so nothing about them may leak by being printed or logged. */
class EmailRecordsTest {

    @Test
    @DisplayName("an email request prints no address, subject or message")
    void emailRequestPrintsNoPersonalData() {
        String printed =
                new EmailRequested("ana@example.com", "Luis se unió", "Luis ya está dentro.", "/groups/7").toString();

        assertThat(printed).doesNotContain("ana@example.com", "Luis");
    }

    @Test
    @DisplayName("a composed email prints no address, subject or body")
    void outgoingEmailPrintsNoPersonalData() {
        String printed = new OutgoingEmail(
                        "SecretMatch", "no-reply@secretmatch.example", "ana@example.com", "Luis", "<p>Luis</p>", "Luis")
                .toString();

        assertThat(printed).doesNotContain("ana@example.com", "Luis");
    }

    @Test
    @DisplayName("mail settings must name a sender address and the app's address")
    void mailSettingsAreRequired() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new MailProperties(" ", URI.create("https://secretmatch.example")));
        assertThatIllegalArgumentException().isThrownBy(() -> new MailProperties("no-reply@secretmatch.example", null));
    }
}
