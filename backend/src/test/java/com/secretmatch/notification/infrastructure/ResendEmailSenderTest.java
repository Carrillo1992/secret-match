package com.secretmatch.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.secretmatch.notification.application.EmailDeliveryException;
import com.secretmatch.notification.application.OutgoingEmail;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ResendEmailSenderTest {

    private static final OutgoingEmail EMAIL = new OutgoingEmail(
            "SecretMatch", "no-reply@secretmatch.example", "ana@example.com", "Asunto", "<p>Hola</p>", "Hola");

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer resend =
            MockRestServiceServer.bindTo(builder).build();
    private final ResendEmailSender sender = new ResendEmailSender(builder, "re_test_key");

    @Test
    @DisplayName("posts the email to the Resend API with the API key")
    void postsEmailToResend() {
        resend.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer re_test_key"))
                .andExpect(content().json("""
                        {
                          "from": "SecretMatch <no-reply@secretmatch.example>",
                          "to": ["ana@example.com"],
                          "subject": "Asunto",
                          "html": "<p>Hola</p>",
                          "text": "Hola"
                        }
                        """, JsonCompareMode.STRICT))
                .andRespond(withSuccess("{\"id\":\"49a3999c\"}", MediaType.APPLICATION_JSON));

        sender.send(EMAIL);

        resend.verify();
    }

    @Test
    @DisplayName("reports a rejected email with the status only, never the provider's answer")
    void reportsRejectionWithoutPersonalData() {
        resend.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Invalid `to` field: ana@example.com\"}"));

        assertThatExceptionOfType(EmailDeliveryException.class)
                .isThrownBy(() -> sender.send(EMAIL))
                .withMessage("Resend answered HTTP 422");
    }
}
