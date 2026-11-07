package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;

/** Ticket #18: a User who forgot their password sets a new one through a link emailed to them. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class PasswordResetIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final String NEW_PASSWORD = "mazapán-de-toledo";
    private static final Pattern VERIFY_LINK = Pattern.compile("/verify-email\\?token=([A-Za-z0-9_-]+)");
    private static final Pattern RESET_LINK = Pattern.compile("/reset-password\\?token=([A-Za-z0-9_-]+)");
    private static final Pattern REFRESH_COOKIE = Pattern.compile("refresh_token=([^;]*)");

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
    @DisplayName("a User asks for a reset, opens the emailed link, sets a new password and signs in with it")
    void resetEndToEnd() {
        verifiedUser(email, PASSWORD);

        askForReset(email).expectStatus().isAccepted();

        List<OutgoingEmail> sent = mail.sentTo(email);
        assertThat(sent).hasSize(1);
        assertThat(sent.getFirst().subject()).isEqualTo("Elige una contraseña nueva en SecretMatch");
        resetPassword(resetToken(email), NEW_PASSWORD).expectStatus().isNoContent();

        signIn(email, NEW_PASSWORD).expectStatus().isOk();
        expectProblem(signIn(email, PASSWORD), "invalid-credentials");
    }

    @Test
    @DisplayName("an email without a User gets the same answer as one with a User, and no email is sent")
    void unknownEmailGetsTheSameAnswer() {
        verifiedUser(email, PASSWORD);
        String unknown = "nobody-" + UUID.randomUUID() + "@example.com";

        String known = askForReset(email)
                .expectStatus()
                .isAccepted()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();
        String forUnknown = askForReset(unknown)
                .expectStatus()
                .isAccepted()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();

        assertThat(forUnknown).isEqualTo(known);
        assertThat(mail.sentTo(unknown)).isEmpty();
        assertThat(mail.sent()).hasSize(1);
    }

    @Test
    @DisplayName("a reset ends every Session of the User")
    void resetEndsEverySession() {
        verifiedUser(email, PASSWORD);
        String phone = refreshCookie(signIn(email, PASSWORD));
        String laptop = refreshCookie(signIn(email, PASSWORD));

        askForReset(email).expectStatus().isAccepted();
        resetPassword(resetToken(email), NEW_PASSWORD).expectStatus().isNoContent();

        expectProblem(refresh(phone), "session-expired");
        expectProblem(refresh(laptop), "session-expired");
    }

    @Test
    @DisplayName("a reset link works only once")
    void linkWorksOnlyOnce() {
        verifiedUser(email, PASSWORD);
        askForReset(email).expectStatus().isAccepted();
        String token = resetToken(email);
        resetPassword(token, NEW_PASSWORD).expectStatus().isNoContent();

        expectProblem(resetPassword(token, "otra-contraseña-más"), "reset-link-used");
        signIn(email, NEW_PASSWORD).expectStatus().isOk();
    }

    @Test
    @DisplayName("a reset link stops working an hour after it was sent, and the password stays as it was")
    void linkExpiresAfterAnHour() {
        verifiedUser(email, PASSWORD);
        askForReset(email).expectStatus().isAccepted();
        String token = resetToken(email);

        clock.advance(Duration.ofHours(1));

        expectProblem(resetPassword(token, NEW_PASSWORD), "reset-link-expired");
        signIn(email, PASSWORD).expectStatus().isOk();
    }

    @Test
    @DisplayName("asking again replaces the link: only the latest one works")
    void onlyTheLatestLinkWorks() {
        verifiedUser(email, PASSWORD);
        askForReset(email).expectStatus().isAccepted();
        String first = resetToken(email);
        askForReset(email).expectStatus().isAccepted();
        String second = resetToken(email);

        expectProblem(resetPassword(first, NEW_PASSWORD), "reset-link-invalid");
        resetPassword(second, NEW_PASSWORD).expectStatus().isNoContent();
    }

    @Test
    @DisplayName("a made-up token is refused as invalid")
    void madeUpTokenIsInvalid() {
        expectProblem(resetPassword("not-a-real-token", NEW_PASSWORD), "reset-link-invalid");
    }

    @Test
    @DisplayName("a User without a password (Google only) sets their first one the same way, then signs in with it")
    void userWithoutPasswordSetsTheFirstOne() {
        jdbc.update(
                "INSERT INTO users (id, email, display_name, password_hash, google_subject, created_at)"
                        + " VALUES (?, ?, 'Ana de Google', NULL, ?, now())",
                UUID.randomUUID(),
                email,
                "google-" + UUID.randomUUID());

        askForReset(email).expectStatus().isAccepted();
        resetPassword(resetToken(email), NEW_PASSWORD).expectStatus().isNoContent();

        signIn(email, NEW_PASSWORD).expectStatus().isOk();
    }

    @Test
    @DisplayName("asking for a reset several times at once answers every request the same, and one link works")
    void simultaneousRequestsAllSucceed() throws Exception {
        verifiedUser(email, PASSWORD);

        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Future<Integer>> statuses = IntStream.range(0, 8)
                    .mapToObj(i -> pool.submit(
                            () -> askForReset(email).returnResult().getStatus().value()))
                    .toList();
            for (Future<Integer> status : statuses) {
                assertThat(status.get()).isEqualTo(202);
            }
        }

        resetPassword(resetToken(email), NEW_PASSWORD).expectStatus().isNoContent();
    }

    // ---------- helpers ----------

    private void verifiedUser(String address, String password) {
        post("/api/v1/sign-ups", Map.of("email", address, "displayName", "Ana", "password", password))
                .expectStatus()
                .isAccepted();
        post("/api/v1/email-verifications", Map.of("token", lastToken(address, VERIFY_LINK)))
                .expectStatus()
                .isNoContent();
        mail.clear();
    }

    private String resetToken(String address) {
        return lastToken(address, RESET_LINK);
    }

    private String lastToken(String address, Pattern link) {
        Matcher matcher = link.matcher(mail.sentTo(address).getLast().text());
        assertThat(matcher.find()).as("link in the last email to " + address).isTrue();
        return matcher.group(1);
    }

    private RestTestClient.ResponseSpec askForReset(String address) {
        return post("/api/v1/password-reset-emails", Map.of("email", address));
    }

    private RestTestClient.ResponseSpec resetPassword(String token, String newPassword) {
        return post("/api/v1/password-resets", Map.of("token", token, "newPassword", newPassword));
    }

    private RestTestClient.ResponseSpec signIn(String address, String password) {
        return post("/api/v1/sessions", Map.of("email", address, "password", password));
    }

    private RestTestClient.ResponseSpec refresh(String refreshToken) {
        return http.post()
                .uri("/api/v1/sessions/refresh")
                .cookie("refresh_token", refreshToken)
                .exchange();
    }

    private static String refreshCookie(RestTestClient.ResponseSpec signIn) {
        EntityExchangeResult<String> result =
                signIn.expectStatus().isOk().expectBody(String.class).returnResult();
        String cookie = result.getResponseHeaders().getFirst(HttpHeaders.SET_COOKIE);
        Matcher matcher = REFRESH_COOKIE.matcher(cookie == null ? "" : cookie);
        assertThat(matcher.find()).as("refresh_token cookie").isTrue();
        return matcher.group(1);
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private static RestTestClient.ResponseSpec expectProblem(RestTestClient.ResponseSpec response, String code) {
        response.expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:" + code);
        return response;
    }
}
