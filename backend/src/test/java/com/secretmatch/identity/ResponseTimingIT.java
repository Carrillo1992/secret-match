package com.secretmatch.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.identity.application.PasswordHasher;
import com.secretmatch.identity.domain.NewPassword;
import com.secretmatch.identity.domain.PasswordHash;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ticket #96: how long an answer takes must not tell whether an email has a User. Emails go out off the
 * request thread, and signing in checks one password whatever the email's state.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({
    TestPostgres.class,
    RecordingEmailSender.Config.class,
    MutableClock.Config.class,
    ResponseTimingIT.PasswordCheckCounting.class
})
class ResponseTimingIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");

    /** What a slow email provider would add to the answer if the request waited for it. */
    private static final Duration SLOW_PROVIDER = Duration.ofSeconds(2);

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    PasswordCheckCounting passwordChecks;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MutableClock clock;

    private String email;

    @BeforeEach
    void freshEmail() {
        mail.clear();
        email = "user-" + UUID.randomUUID() + "@example.com";
    }

    @AfterEach
    void releaseHeldSends() {
        mail.clear();
    }

    @Test
    @DisplayName("asking for a reset for an email with a User does not wait for the email, which still goes out")
    void resetEmailDoesNotHoldTheAnswer() {
        verifiedUser(email);
        mail.clear();
        mail.holdSends();

        Duration answeredIn = timed(() -> post("/api/v1/password-reset-emails", Map.of("email", email))
                .expectStatus()
                .isAccepted());

        assertThat(answeredIn).isLessThan(SLOW_PROVIDER);
        mail.releaseSends();
        assertThat(mail.sentTo(email)).hasSize(1);
    }

    @Test
    @DisplayName("signing up with an email without a User does not wait for the email, which still goes out")
    void signUpEmailDoesNotHoldTheAnswer() {
        mail.holdSends();

        Duration answeredIn = timed(() -> signUp(email, PASSWORD).expectStatus().isAccepted());

        assertThat(answeredIn).isLessThan(SLOW_PROVIDER);
        mail.releaseSends();
        assertThat(mail.sentTo(email)).hasSize(1);
    }

    @Test
    @DisplayName("signing in checks exactly one password whatever the email's state")
    void signInChecksOnePasswordWhateverTheEmail() {
        String withPassword = verifiedUser(email);
        String withoutPassword = verifiedUser("google-" + email);
        jdbc.update("UPDATE users SET password_hash = NULL WHERE email = ?", withoutPassword);
        String threeWaiting = "waiting-" + email;
        signUpLater(threeWaiting, "first-guess-password");
        signUpLater(threeWaiting, "second-guess-password");
        signUpLater(threeWaiting, PASSWORD);

        assertThat(checksToSignIn("nobody-" + email, "wrong-password")).isEqualTo(1);
        assertThat(checksToSignIn("not-an-email", "wrong-password")).isEqualTo(1);
        assertThat(checksToSignIn(withPassword, "wrong-password")).isEqualTo(1);
        assertThat(checksToSignIn(withoutPassword, "wrong-password")).isEqualTo(1);
        assertThat(checksToSignIn(threeWaiting, "wrong-password")).isEqualTo(1);
    }

    @Test
    @DisplayName("the password of the newest waiting sign-up is still told the email is not verified yet")
    void newestWaitingSignUpIsStillNotVerified() {
        signUpLater(email, "first-guess-password");
        signUpLater(email, PASSWORD);

        signIn(email, PASSWORD)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:email-not-verified");
    }

    @Test
    @DisplayName("a new link for an older sign-up does not make it the newest one")
    void newLinkDoesNotMakeASignUpNewer() {
        String older = signUpIdIn(signUpLater(email, "first-guess-password"));
        signUpLater(email, PASSWORD);
        clock.advance(Duration.ofMinutes(1));
        post("/api/v1/sign-ups/" + older + "/verification-emails", Map.of())
                .expectStatus()
                .isAccepted();

        signIn(email, PASSWORD)
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:email-not-verified");
    }

    // ---------- helpers ----------

    private static String signUpIdIn(RestTestClient.ResponseSpec response) {
        String body = response.expectBody(String.class).returnResult().getResponseBody();
        return JsonMapper.builder().build().readTree(body).get("signUpId").asString();
    }

    private int checksToSignIn(String address, String password) {
        int before = passwordChecks.count();
        signIn(address, password).expectStatus().isEqualTo(422);
        return passwordChecks.count() - before;
    }

    private static Duration timed(Runnable action) {
        long start = System.nanoTime();
        action.run();
        return Duration.ofNanos(System.nanoTime() - start);
    }

    /** Signs up and opens the link, returning the address. */
    private String verifiedUser(String address) {
        signUp(address, PASSWORD).expectStatus().isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(address).getLast().text());
        assertThat(matcher.find()).isTrue();
        post("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
        return address;
    }

    /** Signs up a minute after the previous sign-up, so each one is newer than the last. */
    private RestTestClient.ResponseSpec signUpLater(String address, String password) {
        clock.advance(Duration.ofMinutes(1));
        return signUp(address, password).expectStatus().isAccepted();
    }

    private RestTestClient.ResponseSpec signUp(String address, String password) {
        return post(
                "/api/v1/sign-ups",
                Map.of("email", address, "displayName", "Ana", "password", password, "language", "es"));
    }

    private RestTestClient.ResponseSpec signIn(String address, String password) {
        return post("/api/v1/sessions", Map.of("email", address, "password", password));
    }

    private RestTestClient.ResponseSpec post(String path, Map<String, String> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    /** Counts every password the real {@link PasswordHasher} checks. */
    @TestConfiguration(proxyBeanMethods = false)
    static class PasswordCheckCounting {

        private final AtomicInteger checks = new AtomicInteger();

        int count() {
            return checks.get();
        }

        @Bean
        static BeanPostProcessor countPasswordChecks(ObjectProvider<PasswordCheckCounting> counting) {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) {
                    if (!(bean instanceof PasswordHasher real)) {
                        return bean;
                    }
                    return new PasswordHasher() {
                        @Override
                        public PasswordHash hash(NewPassword password) {
                            return real.hash(password);
                        }

                        @Override
                        public boolean matches(String password, PasswordHash hash) {
                            counting.getObject().checks.incrementAndGet();
                            return real.matches(password, hash);
                        }
                    };
                }
            };
        }
    }
}
