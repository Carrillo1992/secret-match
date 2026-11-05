package com.secretmatch.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BaseEmailTemplateTest {

    private final BaseEmailTemplate template = new BaseEmailTemplate(
            new MailProperties("no-reply@secretmatch.example", URI.create("https://secretmatch.example/")));

    @Test
    @DisplayName("sends from the generic SecretMatch sender to the requested recipient")
    void sendsFromGenericSender() {
        OutgoingEmail email = template.render(
                new EmailRequested("ana@example.com", "Tu sorteo está listo", "Ya puedes ver a quién regalas.", "/"));

        assertThat(email.senderName()).isEqualTo("SecretMatch");
        assertThat(email.senderAddress()).isEqualTo("no-reply@secretmatch.example");
        assertThat(email.to()).isEqualTo("ana@example.com");
        assertThat(email.subject()).isEqualTo("Tu sorteo está listo");
    }

    @Test
    @DisplayName("renders a Spanish HTML body with each paragraph of the message")
    void rendersSpanishHtmlBody() {
        OutgoingEmail email = template.render(
                new EmailRequested("ana@example.com", "Asunto", "Primer párrafo.\n\nSegundo párrafo.", "/groups/42"));

        assertThat(email.html())
                .contains("<html lang=\"es\">")
                .contains("<p style=\"margin:0 0 16px;\">Primer párrafo.</p>")
                .contains("<p style=\"margin:0 0 16px;\">Segundo párrafo.</p>")
                .contains(">Abrir SecretMatch</a>")
                .contains("Este correo lo envía SecretMatch automáticamente. No respondas a este mensaje.");
    }

    @Test
    @DisplayName("links to the requested page of the app, in both HTML and plain text")
    void linksToTheApp() {
        OutgoingEmail email =
                template.render(new EmailRequested("ana@example.com", "Asunto", "Mensaje.", "/groups/42"));

        assertThat(email.html()).contains("href=\"https://secretmatch.example/groups/42\"");
        assertThat(email.text())
                .startsWith("Mensaje.\n")
                .contains("Abrir SecretMatch: https://secretmatch.example/groups/42");
    }

    @Test
    @DisplayName("escapes the message so names cannot inject HTML")
    void escapesMessage() {
        OutgoingEmail email =
                template.render(new EmailRequested("ana@example.com", "Asunto", "<b>Ana & Luis</b> se unieron", "/"));

        assertThat(email.html())
                .contains("&lt;b&gt;Ana &amp; Luis&lt;/b&gt; se unieron")
                .doesNotContain("<b>");
    }

    @Test
    @DisplayName("rejects a link that is not a path inside the app")
    void rejectsLinkOutsideTheApp() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new EmailRequested("ana@example.com", "Asunto", "Mensaje.", "https://evil.example/"));
    }
}
