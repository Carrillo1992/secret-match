package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #97: the signed-out identity endpoints are throttled per client IP (429) and per email (silently),
 * and Verification and Password Reset emails share a daily cap. Small limits, so the tests stay short; one
 * trusted proxy, so each test picks its client IP through {@code X-Forwarded-For}. Every test starts on a
 * new day, when every count is back to zero.
 */
@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
            "secretmatch.rate-limit.trusted-proxies=1",
            "secretmatch.rate-limit.daily-email-cap=4",
            "secretmatch.rate-limit.per-email.sign-up.capacity=2",
            "secretmatch.rate-limit.per-email.sign-up.period=1h",
            "secretmatch.rate-limit.per-email.new-verification-link.capacity=2",
            "secretmatch.rate-limit.per-email.new-verification-link.period=1h",
            "secretmatch.rate-limit.per-email.reset-link.capacity=2",
            "secretmatch.rate-limit.per-email.reset-link.period=1h",
            "secretmatch.rate-limit.per-ip.sign-up.capacity=2",
            "secretmatch.rate-limit.per-ip.sign-up.period=1h",
            "secretmatch.rate-limit.per-ip.link-email.capacity=3",
            "secretmatch.rate-limit.per-ip.link-email.period=1h",
            "secretmatch.rate-limit.per-ip.sign-in.capacity=2",
            "secretmatch.rate-limit.per-ip.sign-in.period=1m",
            "secretmatch.rate-limit.per-ip.password-reset.capacity=2",
            "secretmatch.rate-limit.per-ip.password-reset.period=15m"
        })
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class, MutableClock.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class RateLimitingIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
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
    void newDay() {
        clock.advance(Duration.ofDays(1));
        mail.clear();
        email = newEmail();
    }

    // ---------- per client IP ----------

    @Test
    @DisplayName("a reset-link request over the IP's limit gets 429 with Retry-After, the same for any email")
    void resetLinkOverTheIpLimit() {
        verifiedUser(email);
        mail.clear();
        String ip = newIp();
        for (int i = 0; i < 3; i++) {
            askForReset(ip, newEmail()).expectStatus().isAccepted();
        }

        RestTestClient.ResponseSpec forUser = askForReset(ip, email);
        RestTestClient.ResponseSpec forNobody = askForReset(ip, newEmail());

        String userProblem = tooManyRequests(forUser);
        String nobodyProblem = tooManyRequests(forNobody);
        assertThat(userProblem).isEqualTo(nobodyProblem);
        assertThat(JSON.readTree(userProblem).get("type").asString())
                .isEqualTo("urn:secretmatch:problem:too-many-requests");
        assertThat(mail.sentTo(email)).isEmpty();
    }

    @Test
    @DisplayName("another IP keeps its own limit")
    void eachIpHasItsOwnLimit() {
        String ip = newIp();
        for (int i = 0; i < 3; i++) {
            askForReset(ip, newEmail()).expectStatus().isAccepted();
        }
        tooManyRequests(askForReset(ip, newEmail()));

        askForReset(newIp(), newEmail()).expectStatus().isAccepted();
    }

    static Stream<Arguments> throttledEndpoints() {
        String signUp = "{\"email\":\"x\"}";
        String token = "{\"token\":\"made-up\"}";
        return Stream.of(
                Arguments.of("/api/v1/sign-ups", signUp, 2, Duration.ofHours(1)),
                Arguments.of(
                        "/api/v1/sign-ups/" + UUID.randomUUID() + "/verification-emails", "", 3, Duration.ofHours(1)),
                Arguments.of("/api/v1/verification-emails", token, 3, Duration.ofHours(1)),
                Arguments.of("/api/v1/password-reset-emails", "{\"email\":\"a@b.c\"}", 3, Duration.ofHours(1)),
                Arguments.of(
                        "/api/v1/password-resets",
                        "{\"token\":\"made-up\",\"newPassword\":\"mazapán-de-toledo\"}",
                        2,
                        Duration.ofMinutes(15)),
                Arguments.of("/api/v1/sessions", "{\"email\":\"a@b.c\",\"password\":\"x\"}", 2, Duration.ofMinutes(1)));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("throttledEndpoints")
    @DisplayName("each throttled endpoint answers 429 over its limit, and lets the IP in again once the window passes")
    void throttlesAndRecovers(String path, String body, int limit, Duration window) {
        String ip = newIp();
        for (int i = 0; i < limit; i++) {
            assertThat(rawPost(ip, path, body).returnResult().getStatus().value())
                    .isNotEqualTo(429);
        }
        tooManyRequests(rawPost(ip, path, body));

        clock.advance(window.minusSeconds(1));
        tooManyRequests(rawPost(ip, path, body));

        clock.advance(Duration.ofSeconds(1));
        assertThat(rawPost(ip, path, body).returnResult().getStatus().value()).isNotEqualTo(429);
    }

    @Test
    @DisplayName("the endpoints that are not throttled keep answering")
    void otherEndpointsAreNotThrottled() {
        String ip = newIp();
        for (int i = 0; i < 5; i++) {
            assertThat(rawPost(ip, "/api/v1/email-verifications", "{\"token\":\"made-up\"}")
                            .returnResult()
                            .getStatus()
                            .value())
                    .isEqualTo(422);
        }
    }

    // ---------- per email, silent ----------

    @Test
    @DisplayName(
            "a reset link over the email's limit answers 202 like the others, but replaces nothing and sends nothing")
    void resetLinkOverTheEmailLimit() {
        verifiedUser(email);
        mail.clear();
        askForReset(newIp(), email).expectStatus().isAccepted();
        askForReset(newIp(), email).expectStatus().isAccepted();
        String latestLink = lastToken(email);

        askForReset(newIp(), email).expectStatus().isAccepted();

        assertThat(mail.sentTo(email)).hasSize(2);
        post(newIp(), "/api/v1/password-resets", Map.of("token", latestLink, "newPassword", "mazapán-de-toledo"))
                .expectStatus()
                .isNoContent();
    }

    @Test
    @DisplayName("over the email's limit, an email with a User and one without get the same answers")
    void emailWithAndWithoutUserLookAlike() {
        verifiedUser(email);
        mail.clear();
        String nobody = newEmail();

        for (int i = 0; i < 4; i++) {
            RestTestClient.ResponseSpec forUser = askForReset(newIp(), email);
            RestTestClient.ResponseSpec forNobody = askForReset(newIp(), nobody);
            assertThat(forUser.expectStatus()
                            .isAccepted()
                            .expectBody(String.class)
                            .returnResult()
                            .getResponseBody())
                    .isEqualTo(forNobody
                            .expectStatus()
                            .isAccepted()
                            .expectBody(String.class)
                            .returnResult()
                            .getResponseBody());
        }

        assertThat(mail.sentTo(email)).hasSize(2);
        assertThat(mail.sentTo(nobody)).isEmpty();
    }

    @Test
    @DisplayName("a new verification link over the email's limit answers 202 like the others, but sends nothing")
    void newVerificationLinkOverTheEmailLimit() {
        String signUpId = signUp(newIp(), email);

        post(newIp(), "/api/v1/sign-ups/" + signUpId + "/verification-emails", Map.of())
                .expectStatus()
                .isAccepted();
        post(newIp(), "/api/v1/verification-emails", Map.of("token", lastToken(email)))
                .expectStatus()
                .isAccepted();
        String latest = lastToken(email);

        post(newIp(), "/api/v1/sign-ups/" + signUpId + "/verification-emails", Map.of())
                .expectStatus()
                .isAccepted();
        post(newIp(), "/api/v1/verification-emails", Map.of("token", latest))
                .expectStatus()
                .isAccepted();

        assertThat(mail.sentTo(email)).hasSize(3);
        post(newIp(), "/api/v1/email-verifications", Map.of("token", latest))
                .expectStatus()
                .isNoContent();
    }

    @Test
    @DisplayName("a sign-up over the email's limit answers 202 like the others, but saves no sign-up and sends nothing")
    void signUpOverTheEmailLimit() {
        signUp(newIp(), email);
        signUp(newIp(), email);

        String third = signUp(newIp(), email);

        assertThat(third).isNotBlank();
        assertThat(signUpsOf(email)).isEqualTo(2);
        assertThat(mail.sentTo(email)).hasSize(2);
    }

    // ---------- daily cap ----------

    @Test
    @DisplayName("once the daily cap is reached, reset and verification emails stop, but a Group email still goes out")
    void dailyCap(CapturedOutput output) {
        User carmen = signedInUser(email);
        User luis = signedInUser(newEmail());
        askForReset(newIp(), luis.email()).expectStatus().isAccepted();
        askForReset(newIp(), carmen.email()).expectStatus().isAccepted();
        assertThat(mail.sent())
                .as("two Verification and two reset emails: the cap")
                .hasSize(4);

        askForReset(newIp(), luis.email()).expectStatus().isAccepted();
        String late = newEmail();
        signUp(newIp(), late);
        assertThat(mail.sent()).hasSize(4);
        assertThat(signUpsOf(late)).isZero();
        assertThat(output.getAll()).contains("Daily cap");

        String groupId = createGroup(carmen);
        join(luis, inviteCodeOf(carmen, groupId));
        assertThat(mail.sent()).hasSize(5);
        assertThat(mail.sentTo(carmen.email()))
                .last()
                .satisfies(sent -> assertThat(sent.subject()).contains("Navidad"));
    }

    // ---------- logs ----------

    @Test
    @DisplayName("throttling writes no email and no IP to the logs")
    void noPersonalDataInLogs(CapturedOutput output) {
        String ip = newIp();
        verifiedUser(email);
        for (int i = 0; i < 5; i++) {
            askForReset(ip, email);
        }
        for (int i = 0; i < 4; i++) {
            askForReset(newIp(), email);
        }

        assertThat(output.getAll()).doesNotContain(email, ip);
    }

    // ---------- helpers ----------

    record User(String accessToken, String email) {}

    private User signedInUser(String address) {
        verifiedUser(address);
        RestTestClient.ResponseSpec signIn =
                post(newIp(), "/api/v1/sessions", Map.of("email", address, "password", PASSWORD));
        signIn.expectStatus().isOk();
        return new User(json(signIn).get("accessToken").asString(), address);
    }

    private void verifiedUser(String address) {
        signUp(newIp(), address);
        post(newIp(), "/api/v1/email-verifications", Map.of("token", lastToken(address)))
                .expectStatus()
                .isNoContent();
    }

    private String signUp(String ip, String address) {
        RestTestClient.ResponseSpec response = post(
                ip,
                "/api/v1/sign-ups",
                Map.of("email", address, "displayName", "Ana", "password", PASSWORD, "language", "es"));
        response.expectStatus().isAccepted();
        return json(response).get("signUpId").asString();
    }

    private String createGroup(User admin) {
        RestTestClient.ResponseSpec created = http.post()
                .uri("/api/v1/groups")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Navidad", "exchangeDate", "2027-12-24", "currency", "EUR", "timeZone", "UTC"))
                .exchange();
        created.expectStatus().isCreated();
        return json(created).get("id").asString();
    }

    private String inviteCodeOf(User member, String groupId) {
        return json(http.get()
                        .uri("/api/v1/groups/" + groupId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + member.accessToken())
                        .exchange())
                .get("inviteCode")
                .asString();
    }

    private void join(User user, String inviteCode) {
        http.post()
                .uri("/api/v1/memberships")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("inviteCode", inviteCode))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private int signUpsOf(String address) {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM sign_up_verifications WHERE email = ?", Integer.class, address);
        return count == null ? 0 : count;
    }

    private String lastToken(String address) {
        Matcher matcher = LINK.matcher(mail.sentTo(address).getLast().text());
        assertThat(matcher.find()).as("link in the last email").isTrue();
        return matcher.group(1);
    }

    private RestTestClient.ResponseSpec askForReset(String ip, String address) {
        return post(ip, "/api/v1/password-reset-emails", Map.of("email", address));
    }

    private RestTestClient.ResponseSpec post(String ip, String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec rawPost(String ip, String path, String body) {
        return http.post()
                .uri(path)
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    /** Asserts a 429 with a Retry-After in seconds, and returns its problem body. */
    private static String tooManyRequests(RestTestClient.ResponseSpec response) {
        var result = response.expectStatus()
                .isEqualTo(429)
                .expectHeader()
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody(String.class)
                .returnResult();
        String retryAfter = result.getResponseHeaders().getFirst(HttpHeaders.RETRY_AFTER);
        assertThat(retryAfter).isNotNull();
        assertThat(Long.parseLong(retryAfter)).isPositive();
        String body = result.getResponseBody();
        assertThat(body).doesNotContain("@");
        return body == null ? "" : body;
    }

    private static JsonNode json(RestTestClient.ResponseSpec response) {
        return JSON.readTree(response.expectBody(String.class).returnResult().getResponseBody());
    }

    private static String newEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    private static String newIp() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return "198.51." + random.nextInt(256) + "." + (1 + random.nextInt(254));
    }
}
