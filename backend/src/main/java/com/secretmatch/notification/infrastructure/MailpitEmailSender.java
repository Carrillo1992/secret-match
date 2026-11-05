package com.secretmatch.notification.infrastructure;

import com.secretmatch.notification.application.EmailDeliveryException;
import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.OutgoingEmail;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/**
 * Sends to the local mail catcher (Mailpit) through its HTTP send API, so developers see every email
 * the app sends and nothing is really delivered (https://mailpit.axllent.org/docs/api-v1/).
 */
class MailpitEmailSender implements EmailSender {

    private final RestClient mailpit;

    MailpitEmailSender(RestClient.Builder builder, URI baseUrl) {
        this.mailpit = builder.baseUrl(baseUrl.toString()).build();
    }

    @Override
    public void send(OutgoingEmail email) {
        mailpit.post()
                .uri("/api/v1/send")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SendBody(
                        new Contact(email.senderAddress(), email.senderName()),
                        List.of(new Contact(email.to(), null)),
                        email.subject(),
                        email.html(),
                        email.text()))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new EmailDeliveryException(
                            "Mailpit answered HTTP " + response.getStatusCode().value());
                })
                .toBodilessEntity();
    }

    // Mailpit's JSON uses capitalised field names.
    private record SendBody(Contact From, List<Contact> To, String Subject, String HTML, String Text) {}

    private record Contact(String Email, String Name) {}
}
