package com.secretmatch.identity.infrastructure.ratelimit;

import static com.secretmatch.identity.application.LinkEmailLimits.LinkRequest.NEW_VERIFICATION_LINK;
import static com.secretmatch.identity.application.LinkEmailLimits.LinkRequest.RESET_LINK;
import static com.secretmatch.identity.application.LinkEmailLimits.LinkRequest.SIGN_UP;
import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.MutableClock;
import com.secretmatch.identity.domain.EmailAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class InMemoryLinkEmailLimitsTest {

    private static final EmailAddress ANA = new EmailAddress("ana@example.com");
    private static final EmailAddress LUIS = new EmailAddress("luis@example.com");

    private final MutableClock clock = new MutableClock(Instant.parse("2026-12-01T10:00:00Z"));

    private final InMemoryLinkEmailLimits limits = new InMemoryLinkEmailLimits(
            new Limit(2, Duration.ofHours(1)), // sign-up
            new Limit(3, Duration.ofHours(1)), // new verification link
            new Limit(3, Duration.ofHours(1)), // reset link
            4,
            clock);

    @Test
    @DisplayName("an email gets 3 reset links an hour, then none until the hour has passed")
    void resetLinksPerEmail() {
        assertThat(IntStream.range(0, 3).allMatch(i -> limits.allowsRequest(RESET_LINK, ANA)))
                .isTrue();
        assertThat(limits.allowsRequest(RESET_LINK, ANA)).isFalse();

        clock.advance(Duration.ofMinutes(59));
        assertThat(limits.allowsRequest(RESET_LINK, ANA)).isFalse();

        clock.advance(Duration.ofMinutes(1));
        assertThat(limits.allowsRequest(RESET_LINK, ANA)).isTrue();
    }

    @Test
    @DisplayName("each email and each kind of request has its own count")
    void countsAreSeparate() {
        limits.allowsRequest(SIGN_UP, ANA);
        limits.allowsRequest(SIGN_UP, ANA);

        assertThat(limits.allowsRequest(SIGN_UP, ANA)).isFalse();
        assertThat(limits.allowsRequest(SIGN_UP, LUIS)).isTrue();
        assertThat(limits.allowsRequest(NEW_VERIFICATION_LINK, ANA)).isTrue();
        assertThat(limits.allowsRequest(RESET_LINK, ANA)).isTrue();
    }

    @Test
    @DisplayName("the same inbox written differently is the same email")
    void normalizedEmail() {
        limits.allowsRequest(SIGN_UP, ANA);
        limits.allowsRequest(SIGN_UP, new EmailAddress("  ANA@Example.com "));

        assertThat(limits.allowsRequest(SIGN_UP, ANA)).isFalse();
    }

    @Test
    @DisplayName("the daily cap stops sending for the rest of the UTC day, and starts again the next one")
    void dailyCap() {
        clock.set(Instant.parse("2026-12-01T20:00:00Z"));
        assertThat(IntStream.range(0, 4).allMatch(i -> limits.allowsSending())).isTrue();
        assertThat(limits.allowsSending()).isFalse();

        clock.set(Instant.parse("2026-12-01T23:59:59Z"));
        assertThat(limits.allowsSending()).isFalse();

        clock.set(Instant.parse("2026-12-02T00:00:00Z"));
        assertThat(limits.allowsSending()).isTrue();
    }

    @Test
    @DisplayName("reaching the daily cap logs one warning a day, with no personal data")
    void oneWarningPerDay(CapturedOutput output) {
        IntStream.range(0, 4).forEach(i -> limits.allowsSending());
        limits.allowsRequest(RESET_LINK, ANA);

        limits.allowsSending();
        limits.allowsSending();
        assertThat(warnings(output)).isEqualTo(1);

        clock.advance(Duration.ofDays(1));
        IntStream.range(0, 6).forEach(i -> limits.allowsSending());
        assertThat(warnings(output)).isEqualTo(2);
        assertThat(output.getAll()).doesNotContain("ana@example.com");
    }

    private static long warnings(CapturedOutput output) {
        return output.getAll().lines().filter(l -> l.contains("Daily cap")).count();
    }
}
