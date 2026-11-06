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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #14: sign up with a password, verify the email through the link, ask for a new link. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class EmailSignUpIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("http://spa\\.test/verify-email\\?token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

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
    @DisplayName("sign-up sends a verification email whose link creates the User")
    void signUpThenVerify() {
        signUp(email, "Abuela Carmen", PASSWORD).expectStatus().isAccepted();

        OutgoingEmail sent = onlyEmailTo(email);
        assertThat(sent.subject()).isEqualTo("Confirma tu correo en SecretMatch");
        assertThat(sent.text()).contains("24 horas");
        assertThat(sent.subject() + sent.text())
                .as("the sender chose the display name, so the email does not repeat it")
                .doesNotContain("Abuela Carmen");
        assertThat(userPasswordHash(email))
                .as("no User before the link is opened")
                .isNull();

        verify(tokenIn(sent)).expectStatus().isNoContent();

        assertThat(new BCryptPasswordEncoder().matches(PASSWORD, userPasswordHash(email)))
                .isTrue();
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
    @DisplayName("a later sign-up by someone else cannot change the password the owner's link sets")
    void laterSignUpCannotTakeOverTheAccount() {
        signUp(email, "Ana", PASSWORD);
        signUp(email, "Impostor", "the-attackers-password").expectStatus().isAccepted();
        String ownersLink = tokenIn(mail.sentTo(email).get(0));
        String attackersLink = tokenIn(mail.sentTo(email).get(1));

        verify(ownersLink).expectStatus().isNoContent();

        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
        assertThat(bcrypt.matches(PASSWORD, userPasswordHash(email))).isTrue();
        assertThat(bcrypt.matches("the-attackers-password", userPasswordHash(email)))
                .isFalse();
        expectProblem(verify(attackersLink), "verification-link-used");
    }

    @Test
    @DisplayName("an expired link is rejected, and a new link can be asked for in its place")
    void expiredLinkThenNewLink() {
        signUp(email, "Ana", PASSWORD);
        String expired = tokenIn(onlyEmailTo(email));
        clock.advance(Duration.ofHours(24));

        expectProblem(verify(expired), "verification-link-expired");

        askNewLinkInPlaceOf(expired).expectStatus().isAccepted();
        assertThat(mail.sentTo(email)).hasSize(2);
        verify(tokenIn(mail.sentTo(email).get(1))).expectStatus().isNoContent();
        expectProblem(verify(expired), "verification-link-invalid");
    }

    @Test
    @DisplayName("a new link can be asked for with the sign-up id, and replaces the previous one")
    void newLinkForSignUp() {
        String signUpId = signUpId(signUp(email, "Ana", PASSWORD));
        String first = tokenIn(onlyEmailTo(email));

        askNewLinkForSignUp(signUpId).expectStatus().isAccepted();

        assertThat(mail.sentTo(email)).hasSize(2);
        expectProblem(verify(first), "verification-link-invalid");
        verify(tokenIn(mail.sentTo(email).get(1))).expectStatus().isNoContent();

        askNewLinkForSignUp(signUpId).expectStatus().isAccepted();
        assertThat(mail.sentTo(email)).as("no link once verified").hasSize(2);
    }

    @Test
    @DisplayName("signing up with an email that already has a User looks the same and sends nothing")
    void duplicateEmail() {
        signUp(email, "Ana", PASSWORD);
        verify(tokenIn(onlyEmailTo(email)));
        mail.clear();

        String decoyId = signUpId(signUp(email.toUpperCase(), "Impostor", "another-password")
                .expectStatus()
                .isAccepted());
        askNewLinkForSignUp(decoyId).expectStatus().isAccepted();

        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("a second sign-up for the same email cannot be verified once the first one was")
    void secondPendingSignUpAfterVerification(CapturedOutput output) {
        signUp(email, "Ana", PASSWORD);
        signUp(email, "Ana", "another-password");
        String first = tokenIn(mail.sentTo(email).get(0));
        String second = tokenIn(mail.sentTo(email).get(1));

        verify(first).expectStatus().isNoContent();
        expectProblem(verify(second), "verification-link-used");

        assertThat(output.getAll()).doesNotContain(email);
    }

    @Test
    @DisplayName("unknown ids and tokens are answered like any other, and send nothing")
    void unknownIdsAndTokens() {
        expectProblem(verify("not-a-token-we-ever-sent"), "verification-link-invalid");
        askNewLinkInPlaceOf("not-a-token-we-ever-sent").expectStatus().isAccepted();
        askNewLinkForSignUp(UUID.randomUUID().toString()).expectStatus().isAccepted();

        assertThat(mail.sent()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "not-an-email     | Ana   | long-enough-password",
                "ana@example      | Ana   | long-enough-password",
                "''               | Ana   | long-enough-password",
                "ana@example.com  | ''    | long-enough-password",
                "ana@example.com  | '   ' | long-enough-password",
                "ana@example.com  | Ana   | short"
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
        // 40 characters, 80 bytes of UTF-8: the domain rejects it.
        expectProblem(signUp(email, "Ana", "ñ".repeat(40)), "invalid-password");

        assertThat(mail.sent()).isEmpty();
    }

    @Test
    @DisplayName("no password or token value appears in logs or API responses")
    void noSecretsInLogsOrResponses(CapturedOutput output) {
        String signUpBody = body(signUp(email, "Ana", PASSWORD));
        String token = tokenIn(onlyEmailTo(email));
        String verifyBody = body(verify(token));
        String reusedBody = body(verify(token));
        String newLinkBody = body(askNewLinkInPlaceOf(token));

        assertThat(String.join("\n", signUpBody, verifyBody, reusedBody, newLinkBody, output.getAll()))
                .doesNotContain(PASSWORD)
                .doesNotContain(token)
                .doesNotContain(email);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM sign_up_verifications WHERE password_hash LIKE ? OR token_hash = ?",
                        Integer.class,
                        "%" + PASSWORD + "%",
                        token))
                .as("only hashes are stored")
                .isZero();
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

    private RestTestClient.ResponseSpec askNewLinkInPlaceOf(String token) {
        return post("/api/v1/verification-emails", Map.of("token", token));
    }

    private RestTestClient.ResponseSpec askNewLinkForSignUp(String signUpId) {
        return post("/api/v1/sign-ups/" + signUpId + "/verification-emails", Map.of());
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private String userPasswordHash(String address) {
        return jdbc.queryForList("SELECT password_hash FROM users WHERE email = ?", String.class, address).stream()
                .findFirst()
                .orElse(null);
    }

    private static String signUpId(RestTestClient.ResponseSpec response) {
        return JSON.readTree(body(response)).get("signUpId").asString();
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
