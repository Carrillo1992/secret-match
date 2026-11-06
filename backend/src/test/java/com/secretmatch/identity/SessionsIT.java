package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Duration;
import java.util.ArrayList;
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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #15: sign in with a password, refresh the session, sign out. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class SessionsIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final Pattern REFRESH_COOKIE = Pattern.compile("refresh_token=([^;]*)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    MutableClock clock;

    private String email;

    @BeforeEach
    void freshEmail() {
        mail.clear();
        email = "user-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    @DisplayName("a verified User signs in and reaches a protected endpoint with the access token")
    void signInThenReachProtectedEndpoint() {
        verifiedUser(email, "Abuela Carmen", PASSWORD);

        Session session = signedIn(signIn(email.toUpperCase(), PASSWORD));

        me(session.accessToken())
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Abuela Carmen")
                .jsonPath("$.email")
                .isEqualTo(email);
    }

    @Test
    @DisplayName(
            "the refresh token travels only in an HttpOnly, Secure, SameSite=None cookie for the session endpoints")
    void refreshCookieAttributes() {
        verifiedUser(email, "Ana", PASSWORD);

        EntityExchangeResult<String> result = signIn(email, PASSWORD)
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult();

        String cookie = result.getResponseHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(cookie)
                .startsWith("refresh_token=")
                .contains("Path=/api/v1/sessions")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=None")
                .contains("Max-Age=2592000");
        assertThat(result.getResponseBody()).doesNotContain(cookieValue(cookie));
    }

    @Test
    @DisplayName("a wrong password and an unknown email get the same generic error")
    void wrongPasswordAndUnknownEmailLookTheSame() {
        verifiedUser(email, "Ana", PASSWORD);

        String wrongPassword = body(expectProblem(signIn(email, "not-the-password"), "invalid-credentials"));
        String unknownEmail = body(expectProblem(signIn("nobody-" + email, PASSWORD), "invalid-credentials"));

        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @Test
    @DisplayName("a sign-up whose link was never opened cannot sign in")
    void unverifiedUserIsRefused() {
        post("/api/v1/sign-ups", Map.of("email", email, "displayName", "Ana", "password", PASSWORD))
                .expectStatus()
                .isAccepted();

        expectProblem(signIn(email, PASSWORD), "email-not-verified");
        expectProblem(signIn(email, "someone-elses-guess"), "invalid-credentials");
    }

    @Test
    @DisplayName("protected endpoints reject a missing, malformed, tampered or expired access token")
    void protectedEndpointsRejectBadAccessTokens() {
        verifiedUser(email, "Ana", PASSWORD);
        String token = signedIn(signIn(email, PASSWORD)).accessToken();
        String[] parts = token.split("\\.");
        String otherUser =
                JSON.writeValueAsString(Map.of("sub", UUID.randomUUID().toString(), "iss", "secretmatch"));
        String tampered = parts[0] + "."
                + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(otherUser.getBytes()) + "."
                + parts[2];

        expectUnauthenticated(http.get().uri("/api/v1/users/me").exchange());
        expectUnauthenticated(me("not-a-jwt"));
        expectUnauthenticated(me(tampered));

        me(token).expectStatus().isOk();
        clock.advance(Duration.ofMinutes(15).plusSeconds(1));
        expectUnauthenticated(me(token));
    }

    @Test
    @DisplayName("after a reload, the refresh cookie brings back the session and is rotated")
    void refreshRecoversTheSession() {
        verifiedUser(email, "Ana", PASSWORD);
        Session first = signedIn(signIn(email, PASSWORD));
        clock.advance(Duration.ofMinutes(20));

        Session second = signedIn(refresh(first.refreshToken()));

        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
        me(second.accessToken()).expectStatus().isOk();
        Session third = signedIn(refresh(second.refreshToken()));
        me(third.accessToken()).expectStatus().isOk();
    }

    @Test
    @DisplayName("refreshing without a cookie, or with an unknown one, needs a new sign-in")
    void refreshWithoutValidCookie() {
        expectProblem(http.post().uri("/api/v1/sessions/refresh").exchange(), "session-expired");
        expectProblem(refresh("never-issued"), "session-expired");
    }

    @Test
    @DisplayName("a refresh token unused for 30 days no longer works")
    void refreshTokenExpires() {
        verifiedUser(email, "Ana", PASSWORD);
        Session session = signedIn(signIn(email, PASSWORD));
        clock.advance(Duration.ofDays(30));

        expectProblem(refresh(session.refreshToken()), "session-expired");
    }

    @Test
    @DisplayName("signing out ends the session: the old refresh token no longer works and the cookie is cleared")
    void signOutEndsTheSession() {
        verifiedUser(email, "Ana", PASSWORD);
        Session session = signedIn(signIn(email, PASSWORD));

        String cleared = signOut(session.refreshToken())
                .expectStatus()
                .isNoContent()
                .expectBody(String.class)
                .returnResult()
                .getResponseHeaders()
                .getFirst(HttpHeaders.SET_COOKIE);

        assertThat(cleared).startsWith("refresh_token=;").contains("Max-Age=0").contains("Path=/api/v1/sessions");
        expectProblem(refresh(session.refreshToken()), "session-expired");
        signOut(session.refreshToken()).expectStatus().isNoContent();
    }

    @Test
    @DisplayName("signing out ends only that session, not the User's other ones")
    void signOutEndsOnlyThatSession() {
        verifiedUser(email, "Ana", PASSWORD);
        Session phone = signedIn(signIn(email, PASSWORD));
        Session laptop = signedIn(signIn(email, PASSWORD));

        signOut(phone.refreshToken()).expectStatus().isNoContent();

        refresh(laptop.refreshToken()).expectStatus().isOk();
    }

    @Test
    @DisplayName("reusing a rotated refresh token revokes its session, newest token included")
    void reuseRevokesTheSession() {
        verifiedUser(email, "Ana", PASSWORD);
        Session stolen = signedIn(signIn(email, PASSWORD));
        Session rotated = signedIn(refresh(stolen.refreshToken()));
        clock.advance(Duration.ofSeconds(11));

        expectProblem(refresh(stolen.refreshToken()), "session-expired");

        expectProblem(refresh(rotated.refreshToken()), "session-expired");
    }

    @Test
    @DisplayName("two tabs refreshing with the same cookie at once both get an access token, and the session survives")
    void concurrentRefreshesKeepTheSession() {
        verifiedUser(email, "Ana", PASSWORD);
        Session signedIn = signedIn(signIn(email, PASSWORD));
        Session firstTab = signedIn(refresh(signedIn.refreshToken()));

        EntityExchangeResult<String> secondTab = refresh(signedIn.refreshToken())
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult();

        assertThat(secondTab.getResponseHeaders().get(HttpHeaders.SET_COOKIE))
                .as("the browser already holds the rotated cookie the first tab got")
                .isNull();
        String secondAccessToken =
                JSON.readTree(secondTab.getResponseBody()).get("accessToken").asString();
        me(secondAccessToken).expectStatus().isOk();
        clock.advance(Duration.ofSeconds(11));
        refresh(firstTab.refreshToken()).expectStatus().isOk();
    }

    @Test
    @DisplayName("another site cannot make the browser refresh the session")
    void refreshFromAnotherSiteIsRefused() {
        verifiedUser(email, "Ana", PASSWORD);
        Session session = signedIn(signIn(email, PASSWORD));

        http.post()
                .uri("/api/v1/sessions/refresh")
                .header(HttpHeaders.ORIGIN, "http://evil.test")
                .cookie("refresh_token", session.refreshToken())
                .exchange()
                .expectStatus()
                .isForbidden();

        clock.advance(Duration.ofSeconds(11));
        refresh(session.refreshToken()).expectStatus().isOk();
    }

    @Test
    @DisplayName("lets the SPA origin sign out with its cookie")
    void letsSpaOriginSignOutWithCredentials() {
        http.options()
                .uri("/api/v1/sessions/current")
                .header(HttpHeaders.ORIGIN, "http://spa.test")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.DELETE.name())
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://spa.test")
                .expectHeader()
                .valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
    }

    @Test
    @DisplayName("no password or token value appears in logs")
    void noTokensInLogs(CapturedOutput output) {
        verifiedUser(email, "Ana", PASSWORD);
        Session first = signedIn(signIn(email, PASSWORD));
        Session second = signedIn(refresh(first.refreshToken()));
        refresh(first.refreshToken());
        signIn(email, "wrong-password");
        signOut(second.refreshToken());

        List<String> secrets = new ArrayList<>(List.of(
                PASSWORD, first.accessToken(), first.refreshToken(), second.accessToken(), second.refreshToken()));
        assertThat(secrets).allSatisfy(secret -> assertThat(output.getAll()).doesNotContain(secret));
    }

    // ---------- helpers ----------

    private record Session(String accessToken, String refreshToken) {}

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

    private RestTestClient.ResponseSpec signIn(String address, String password) {
        return post("/api/v1/sessions", Map.of("email", address, "password", password));
    }

    private RestTestClient.ResponseSpec refresh(String refreshToken) {
        return http.post()
                .uri("/api/v1/sessions/refresh")
                .cookie("refresh_token", refreshToken)
                .exchange();
    }

    private RestTestClient.ResponseSpec signOut(String refreshToken) {
        return http.delete()
                .uri("/api/v1/sessions/current")
                .cookie("refresh_token", refreshToken)
                .exchange();
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

    private static Session signedIn(RestTestClient.ResponseSpec response) {
        EntityExchangeResult<String> result =
                response.expectStatus().isOk().expectBody(String.class).returnResult();
        String accessToken =
                JSON.readTree(result.getResponseBody()).get("accessToken").asString();
        String cookie = result.getResponseHeaders().getFirst(HttpHeaders.SET_COOKIE);
        return new Session(accessToken, cookieValue(cookie));
    }

    private static String cookieValue(String setCookie) {
        Matcher matcher = REFRESH_COOKIE.matcher(setCookie == null ? "" : setCookie);
        assertThat(matcher.find()).as("refresh_token cookie").isTrue();
        return matcher.group(1);
    }

    private static String body(RestTestClient.ResponseSpec response) {
        String body = response.expectBody(String.class).returnResult().getResponseBody();
        return body == null ? "" : body;
    }

    private static RestTestClient.ResponseSpec expectProblem(RestTestClient.ResponseSpec response, String code) {
        response.expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:" + code);
        return response;
    }

    private static void expectUnauthenticated(RestTestClient.ResponseSpec response) {
        response.expectStatus()
                .isUnauthorized()
                .expectHeader()
                .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody()
                .jsonPath("$.status")
                .isEqualTo(401);
    }
}
