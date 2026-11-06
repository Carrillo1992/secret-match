package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

/** Ticket #14: sign up with a password, verify the email through the link, ask for it again. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class EmailSignUpIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("http://spa\\.test/verify-email\\?token=([A-Za-z0-9_-]+)");

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    @Autowired
    JdbcTemplate jdbc;

    private String email;

    @BeforeEach
    void freshEmail() {
        mail.clear();
        email = "user-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    @DisplayName("sign-up sends a verification email whose link verifies the User")
    void signUpThenVerify() {
        signUp(email, "Abuela Carmen", PASSWORD).expectStatus().isAccepted();

        OutgoingEmail sent = onlyEmailTo(email);
        assertThat(sent.subject()).isEqualTo("Confirma tu correo en SecretMatch");
        assertThat(sent.text()).contains("Abuela Carmen").contains("24 horas");

        verify(tokenIn(sent)).expectStatus().isNoContent();

        // A verified User gets no more links.
        requestVerificationEmail(email).expectStatus().isAccepted();
        assertThat(mail.sentTo(email)).hasSize(1);
    }

    @Test
    @DisplayName("a link already used is rejected with its own problem type")
    void usedLinkIsRejected() {
        signUp(email, "Ana", PASSWORD);
        String token = tokenIn(onlyEmailTo(email));
        verify(token).expectStatus().isNoContent();

        expectProblem(verify(token), "verification-link-used");
    }

    @Test
    @DisplayName("an expired link is rejected, and a new one can be asked for and works")
    void expiredLinkThenResend() {
        signUp(email, "Ana", PASSWORD);
        String expired = tokenIn(onlyEmailTo(email));
        clock.advance(Duration.ofHours(24));

        expectProblem(verify(expired), "verification-link-expired");

        requestVerificationEmail(email).expectStatus().isAccepted();
        assertThat(mail.sentTo(email)).hasSize(2);
        verify(tokenIn(mail.sentTo(email).get(1))).expectStatus().isNoContent();
    }

    @Test
    @DisplayName("a link with an unknown token is rejected as invalid")
    void unknownTokenIsInvalid() {
        expectProblem(verify("not-a-token-we-ever-sent"), "verification-link-invalid");
    }

    @Test
    @DisplayName("signing up with an email that already has a verified User looks the same and sends nothing")
    void duplicateVerifiedEmail() {
        String firstBody = body(signUp(email, "Ana", PASSWORD).expectStatus().isAccepted());
        verify(tokenIn(onlyEmailTo(email)));
        mail.clear();

        String secondBody = body(signUp(email.toUpperCase(), "Impostor", "another-password")
                .expectStatus()
                .isAccepted());

        assertThat(secondBody).isEqualTo(firstBody);
        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("signing up again before verifying sends a new link that verifies the latest sign-up")
    void duplicateUnverifiedEmail() {
        signUp(email, "Ana", PASSWORD);
        signUp(email, "Ana García", "a-newer-password").expectStatus().isAccepted();

        assertThat(mail.sentTo(email)).hasSize(2);
        OutgoingEmail latest = mail.sentTo(email).get(1);
        assertThat(latest.text()).contains("Ana García");
        verify(tokenIn(latest)).expectStatus().isNoContent();
    }

    @Test
    @DisplayName("asking for a link for an unknown email looks the same and sends nothing")
    void resendToUnknownEmail() {
        requestVerificationEmail(email).expectStatus().isAccepted();

        assertThat(mail.sent()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "not-an-email     | Ana | long-enough-password",
                "''               | Ana | long-enough-password",
                "ana@example.com  | ''  | long-enough-password",
                "ana@example.com  | '   ' | long-enough-password",
                "ana@example.com  | Ana | short"
            })
    @DisplayName("rejects invalid sign-up details with a 400 problem and sends nothing")
    void rejectsInvalidDetails(String address, String displayName, String password) {
        signUp(address, displayName, password)
                .expectStatus()
                .isBadRequest()
                .expectHeader()
                .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("rejects a display name over 50 characters and a password over 72 bytes")
    void rejectsTooLongDetails() {
        signUp(email, "x".repeat(51), PASSWORD).expectStatus().isBadRequest();
        // 40 characters, 80 bytes of UTF-8.
        signUp(email, "Ana", "ñ".repeat(40)).expectStatus().is4xxClientError();

        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("the password is stored only as a BCrypt hash")
    void storesOnlyPasswordHash() {
        signUp(email, "Ana", PASSWORD);

        String stored = jdbc.queryForObject("SELECT password_hash FROM users WHERE email = ?", String.class, email);
        assertThat(stored).startsWith("$2").doesNotContain(PASSWORD);
    }

    @Test
    @DisplayName("no password or token value appears in logs or API responses")
    void noSecretsInLogsOrResponses(CapturedOutput output) {
        String signUpBody = body(signUp(email, "Ana", PASSWORD));
        String token = tokenIn(onlyEmailTo(email));
        String verifyBody = body(verify(token));
        String reusedBody = body(verify(token));
        String resendBody = body(requestVerificationEmail(email));

        assertThat(String.join("\n", signUpBody, verifyBody, reusedBody, resendBody, output.getAll()))
                .doesNotContain(PASSWORD)
                .doesNotContain(token)
                .doesNotContain(email);
    }

    @Test
    @DisplayName("lets the SPA origin post a sign-up")
    void letsSpaOriginPostSignUp() {
        http.options()
                .uri("/api/v1/sign-ups")
                .header(HttpHeaders.ORIGIN, "http://spa.test")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name())
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, HttpHeaders.CONTENT_TYPE)
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://spa.test");
    }

    private RestTestClient.ResponseSpec signUp(String address, String displayName, String password) {
        return post("/api/v1/sign-ups", Map.of("email", address, "displayName", displayName, "password", password));
    }

    private RestTestClient.ResponseSpec verify(String token) {
        return post("/api/v1/email-verifications", Map.of("token", token));
    }

    private RestTestClient.ResponseSpec requestVerificationEmail(String address) {
        return post("/api/v1/verification-emails", Map.of("email", address));
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private static String body(RestTestClient.ResponseSpec response) {
        String body = response.expectBody(String.class).returnResult().getResponseBody();
        return body == null ? "" : body;
    }

    private static void expectProblem(RestTestClient.ResponseSpec response, String code) {
        response.expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:" + code);
    }

    private OutgoingEmail onlyEmailTo(String address) {
        assertThat(mail.sentTo(address)).as("emails to the new User").hasSize(1);
        return mail.sentTo(address).getFirst();
    }

    private static String tokenIn(OutgoingEmail email) {
        Matcher matcher = LINK.matcher(email.text());
        assertThat(matcher.find()).as("verification link in the email").isTrue();
        return matcher.group(1);
    }
}
