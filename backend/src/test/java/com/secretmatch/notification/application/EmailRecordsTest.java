package com.secretmatch.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.secretmatch.shared.domain.Language;
import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Emails carry personal data, so nothing about them may leak by being printed or logged. */
class EmailRecordsTest {

    @Test
    @DisplayName("an email request prints no address, subject or message")
    void emailRequestPrintsNoPersonalData() {
        String printed = new EmailRequested(
                        "ana@example.com", Language.SPANISH, "Luis se unió", "Luis ya está dentro.", "/groups/7")
                .toString();

        assertThat(printed).doesNotContain("ana@example.com", "Luis");
    }

    @Test
    @DisplayName("an email's text prints no subject or message")
    void emailTextPrintsNoPersonalData() {
        String printed = new EmailText("Luis se unió", "Luis ya está dentro.").toString();

        assertThat(printed).doesNotContain("Luis");
    }

    @Test
    @DisplayName("an email request takes its subject and message from the text written for the recipient")
    void emailRequestTakesItsText() {
        EmailRequested email = new EmailRequested(
                "ana@example.com", Language.ENGLISH, new EmailText("Luis joined", "Luis is in."), "/groups/7");

        assertThat(email.subject()).isEqualTo("Luis joined");
        assertThat(email.message()).isEqualTo("Luis is in.");
        assertThat(email.language()).isEqualTo(Language.ENGLISH);
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
