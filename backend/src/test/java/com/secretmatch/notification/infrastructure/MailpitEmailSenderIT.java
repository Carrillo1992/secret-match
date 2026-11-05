package com.secretmatch.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.notification.application.OutgoingEmail;
import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.databind.JsonNode;

/** The local mail catcher really receives what the app sends (same image as docker-compose.yml). */
@Testcontainers
class MailpitEmailSenderIT {

    @Container
    static final GenericContainer<?> MAILPIT = new GenericContainer<>("axllent/mailpit:v1.33.0")
            .withExposedPorts(8025)
            .waitingFor(Wait.forHttp("/readyz").forPort(8025));

    @Test
    @DisplayName("an email sent through the adapter shows up in the mail catcher")
    void emailShowsUpInMailCatcher() {
        URI mailpit = URI.create("http://" + MAILPIT.getHost() + ":" + MAILPIT.getMappedPort(8025));
        MailpitEmailSender sender = new MailpitEmailSender(RestClient.builder(), mailpit);

        sender.send(new OutgoingEmail(
                "SecretMatch",
                "no-reply@secretmatch.test",
                "ana@example.com",
                "Tu sorteo está listo",
                "<p>Hola</p>",
                "Hola"));

        JsonNode message = RestClient.create(mailpit.toString())
                .get()
                .uri("/api/v1/messages")
                .retrieve()
                .body(JsonNode.class)
                .at("/messages/0");
        assertThat(message.at("/Subject").asString()).isEqualTo("Tu sorteo está listo");
        assertThat(message.at("/From/Name").asString()).isEqualTo("SecretMatch");
        assertThat(message.at("/From/Address").asString()).isEqualTo("no-reply@secretmatch.test");
        assertThat(message.at("/To/0/Address").asString()).isEqualTo("ana@example.com");
    }
}
