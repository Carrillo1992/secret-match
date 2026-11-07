package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.identity.application.AccessTokens;
import com.secretmatch.identity.domain.SessionId;
import com.secretmatch.identity.domain.UserId;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
import tools.jackson.databind.json.JsonMapper;

/** Ticket #17: the signed-in User changes their display name and their password. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
class ProfileIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final Pattern REFRESH_COOKIE = Pattern.compile("refresh_token=([^;]*)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    AccessTokens accessTokens;

    @Autowired
    JdbcTemplate jdbc;

    private String email;

    @BeforeEach
    void freshEmail() {
        mail.clear();
        email = "user-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    @DisplayName("a changed display name is what the User sees on their next load")
    void changeDisplayName() {
        verifiedUser(email, "Ana", PASSWORD);
        Session session = signedIn(signIn(email, PASSWORD));

        put(session, "/api/v1/users/me/display-name", Map.of("displayName", "  Tía Ana  "))
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Tía Ana");

        me(session.accessToken())
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Tía Ana");
    }

    @Test
    @DisplayName("a password change with a wrong current password is refused, and the old password keeps working")
    void wrongCurrentPasswordIsRefused() {
        verifiedUser(email, "Ana", PASSWORD);
        Session session = signedIn(signIn(email, PASSWORD));

        expectProblem(
                put(
                        session,
                        "/api/v1/users/me/password",
                        Map.of("currentPassword", "not-the-password", "newPassword", "mazapán-de-toledo")),
                "wrong-password");

        signIn(email, PASSWORD).expectStatus().isOk();
        expectProblem(signIn(email, "mazapán-de-toledo"), "invalid-credentials");
    }

    @Test
    @DisplayName(
            "a User without a password (signed up with Google) sets one without a current one, then signs in with it")
    void userWithoutPasswordSetsOne() {
        Session session = new Session(
                accessTokens
                        .issueFor(userWithoutPassword(email), SessionId.newId())
                        .value(),
                "");
        me(session.accessToken())
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.hasPassword")
                .isEqualTo(false);

        put(session, "/api/v1/users/me/password", Map.of("newPassword", "mazapán-de-toledo"))
                .expectStatus()
                .isNoContent();

        me(session.accessToken())
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.hasPassword")
                .isEqualTo(true);
        signIn(email, "mazapán-de-toledo").expectStatus().isOk();
    }

    @Test
    @DisplayName("a password change ends the User's Sessions on every other device, but not this one")
    void passwordChangeEndsOtherSessions() {
        verifiedUser(email, "Ana", PASSWORD);
        Session phone = signedIn(signIn(email, PASSWORD));
        Session laptop = signedIn(signIn(email, PASSWORD));

        put(
                        laptop,
                        "/api/v1/users/me/password",
                        Map.of("currentPassword", PASSWORD, "newPassword", "mazapán-de-toledo"))
                .expectStatus()
                .isNoContent();

        expectProblem(refresh(phone.refreshToken()), "session-expired");
        refresh(laptop.refreshToken()).expectStatus().isOk();
        expectProblem(signIn(email, PASSWORD), "invalid-credentials");
        signIn(email, "mazapán-de-toledo").expectStatus().isOk();
    }

    // ---------- helpers ----------

    /** Google sign-in (#16) does not exist yet; this is the User it would create. */
    private UserId userWithoutPassword(String address) {
        UserId id = UserId.newId();
        jdbc.update(
                "INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, NULL, now())",
                id.value(),
                address,
                "Ana de Google");
        return id;
    }

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

    private RestTestClient.ResponseSpec me(String accessToken) {
        return http.get()
                .uri("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .exchange();
    }

    private RestTestClient.ResponseSpec put(Session session, String path, Map<String, String> body) {
        return http.put()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + session.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
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
        Matcher matcher = REFRESH_COOKIE.matcher(cookie == null ? "" : cookie);
        assertThat(matcher.find()).as("refresh_token cookie").isTrue();
        return new Session(accessToken, matcher.group(1));
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
