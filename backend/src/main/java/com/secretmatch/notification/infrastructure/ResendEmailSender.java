package com.secretmatch.notification.infrastructure;

import com.secretmatch.notification.application.EmailDeliveryException;
import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.OutgoingEmail;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/** Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
class ResendEmailSender implements EmailSender {

    private final RestClient resend;

    ResendEmailSender(RestClient.Builder builder, String apiKey) {
        this.resend = builder.baseUrl("https://api.resend.com")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
    }

    @Override
    public void send(OutgoingEmail email) {
        resend.post()
                .uri("/emails")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SendEmailBody(
                        email.senderName() + " <" + email.senderAddress() + ">",
                        List.of(email.to()),
                        email.subject(),
                        email.html(),
                        email.text()))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    // The response body can echo the recipient, so only the status is reported.
                    throw new EmailDeliveryException(
                            "Resend answered HTTP " + response.getStatusCode().value());
                })
                .toBodilessEntity();
    }

    private record SendEmailBody(String from, List<String> to, String subject, String html, String text) {}
}
