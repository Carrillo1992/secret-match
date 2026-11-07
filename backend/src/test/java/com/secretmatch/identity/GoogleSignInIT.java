package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #16: sign in with Google, against a fake Google that signs with locally generated keys. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class GoogleSignInIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final FakeGoogle GOOGLE = FakeGoogle.instance();

    @DynamicPropertySource
    static void google(DynamicPropertyRegistry registry) {
        registry.add("secretmatch.security.google.client-id", () -> FakeGoogle.CLIENT_ID);
        registry.add("secretmatch.security.google.jwk-set-uri", GOOGLE::jwkSetUri);
    }

    @Autowired
    RestTestClient http;

    @Autowired
    MutableClock clock;

    @Autowired
    RecordingEmailSender mail;

    private String email;
    private String subject;

    @BeforeEach
    void freshIdentity() {
        email = "google-" + UUID.randomUUID() + "@example.com";
        subject = UUID.randomUUID().toString();
    }

    @Test
    @DisplayName("a new Google email creates a User named as in Google, and signs them in")
    void newEmailCreatesUser() {
        String idToken = GOOGLE.idToken(clock.instant(), subject, email, "Abuela Carmen");

        String accessToken = signedIn(signInWithGoogle(idToken));

        me(accessToken)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.email")
                .isEqualTo(email)
                .jsonPath("$.displayName")
                .isEqualTo("Abuela Carmen")
                .jsonPath("$.hasPassword")
                .isEqualTo(false);
    }

    @Test
    @DisplayName("an email that already has a User is linked to Google, and the password still signs in")
    void existingEmailIsLinked() {
        verifiedUser(email, "Ana", PASSWORD);

        String viaGoogle = signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, email, "Ana G.")));
        String viaPassword = signedIn(post("/api/v1/sessions", Map.of("email", email, "password", PASSWORD)));

        me(viaGoogle)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Ana")
                .jsonPath("$.hasPassword")
                .isEqualTo(true);
        me(viaPassword).expectStatus().isOk().expectBody().jsonPath("$.email").isEqualTo(email);
        signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, email, "Ana G.")));
    }

    @Test
    @DisplayName("the Google account signs in to its User even after its email changes in Google")
    void googleAccountKeepsItsUserWhenItsEmailChanges() {
        String first = signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, email, "Ana")));
        String renamedEmail = "renamed-" + email;

        String second = signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, renamedEmail, "Ana")));

        me(first).expectStatus().isOk().expectBody().jsonPath("$.email").isEqualTo(email);
        me(second).expectStatus().isOk().expectBody().jsonPath("$.email").isEqualTo(email);
    }

    @Test
    @DisplayName("another Google account cannot take over a User already linked to Google")
    void anotherGoogleAccountCannotTakeOver() {
        signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, email, "Ana")));

        expectRejected(signInWithGoogle(GOOGLE.idToken(clock.instant(), "another-subject", email, "Ana")));
    }

    @Test
    @DisplayName("a token with a forged signature, for another app, from another issuer or expired is rejected")
    void untrustworthyTokensAreRejected() {
        Instant now = clock.instant();

        expectRejected(signInWithGoogle(GOOGLE.idTokenSignedByStranger(now, subject, email, "Ana")));
        expectRejected(signInWithGoogle(GOOGLE.idToken(
                now,
                subject,
                email,
                "Ana",
                claims -> claims.audience(List.of("another-app.apps.googleusercontent.com")))));
        expectRejected(signInWithGoogle(
                GOOGLE.idToken(now, subject, email, "Ana", claims -> claims.issuer("https://evil.example.com"))));
        expectRejected(signInWithGoogle(GOOGLE.idToken(now.minus(Duration.ofHours(2)), subject, email, "Ana")));
        expectRejected(signInWithGoogle("not-a-jwt"));
        expectRejected(post("/api/v1/sessions", Map.of("email", email, "password", PASSWORD)), "invalid-credentials");
    }

    @Test
    @DisplayName("a token for an email Google has not verified is rejected")
    void unverifiedEmailIsRejected() {
        String unverified =
                GOOGLE.idToken(clock.instant(), subject, email, "Ana", claims -> claims.claim("email_verified", false));
        String withoutTheClaim = GOOGLE.idToken(
                clock.instant(), subject, email, "Ana", claims -> claims.claims(all -> all.remove("email_verified")));

        expectRejected(signInWithGoogle(unverified));
        expectRejected(signInWithGoogle(withoutTheClaim));
    }

    @Test
    @DisplayName("without a name in Google, the new User is named after their email")
    void namelessGoogleAccount() {
        me(signedIn(signInWithGoogle(GOOGLE.idToken(clock.instant(), subject, email, null))))
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo(email.substring(0, email.indexOf('@')));
    }

    @Test
    @DisplayName("no ID token or session token appears in logs")
    void noTokensInLogs(CapturedOutput output) {
        String idToken = GOOGLE.idToken(clock.instant(), subject, email, "Ana");
        String accessToken = signedIn(signInWithGoogle(idToken));
        String forged = GOOGLE.idTokenSignedByStranger(clock.instant(), subject, email, "Ana");
        signInWithGoogle(forged);

        assertThat(List.of(idToken, accessToken, forged))
                .allSatisfy(secret -> assertThat(output.getAll()).doesNotContain(secret));
    }

    // ---------- helpers ----------

    private void verifiedUser(String address, String displayName, String password) {
        post("/api/v1/sign-ups", Map.of("email", address, "displayName", displayName, "password", password))
                .expectStatus()
                .isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(address).getLast().text());
        assertThat(matcher.find()).isTrue();
        post("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
    }

    private static void expectRejected(RestTestClient.ResponseSpec response) {
        expectRejected(response, "google-sign-in-rejected");
    }

    private static void expectRejected(RestTestClient.ResponseSpec response, String code) {
        response.expectStatus()
                .isEqualTo(422)
                .expectHeader()
                .doesNotExist(HttpHeaders.SET_COOKIE)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:" + code);
    }

    private RestTestClient.ResponseSpec signInWithGoogle(String idToken) {
        return post("/api/v1/sessions/google", Map.of("idToken", idToken));
    }

    private RestTestClient.ResponseSpec me(String accessToken) {
        return http.get()
                .uri("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    /** The access token of a successful sign-in, after checking it also set the refresh cookie. */
    private static String signedIn(RestTestClient.ResponseSpec response) {
        EntityExchangeResult<String> result = response.expectStatus()
                .isOk()
                .expectHeader()
                .valueMatches(HttpHeaders.SET_COOKIE, "refresh_token=.+;.*HttpOnly.*")
                .expectBody(String.class)
                .returnResult();
        return JSON.readTree(result.getResponseBody()).get("accessToken").asString();
    }
}
