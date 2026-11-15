package com.secretmatch.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

import com.secretmatch.RecordingEmailSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.shared.domain.Language;
import java.time.Duration;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Emails go out only after the business transaction commits, off the caller's thread, and never break the
 * business action (architecture §2.5).
 */
@SpringBootTest
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingEmailSender.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class EmailDeliveryIT {

    private static final EmailRequested JOINED = new EmailRequested(
            "ana.garcia@example.com",
            Language.SPANISH,
            "Luis Pérez se ha unido a tu grupo",
            "Luis Pérez ya forma parte de Navidad.",
            "/");

    /** Far more than the executor holds: its threads plus its queue. */
    private static final int MORE_THAN_THE_EXECUTOR_HOLDS = 200;

    @Autowired
    ApplicationEventPublisher events;

    @Autowired
    TransactionTemplate transaction;

    @Autowired
    RecordingEmailSender sender;

    @BeforeEach
    void reset() {
        sender.clear();
    }

    @AfterEach
    void releaseHeldSends() {
        sender.clear();
    }

    @Test
    @DisplayName("sends the email once the transaction commits")
    void sendsAfterCommit() {
        transaction.executeWithoutResult(status -> {
            events.publishEvent(JOINED);
            assertThat(sender.sent()).as("nothing is sent before the commit").isEmpty();
        });

        assertThat(sender.sent()).singleElement().satisfies(email -> {
            assertThat(email.to()).isEqualTo("ana.garcia@example.com");
            assertThat(email.subject()).isEqualTo("Luis Pérez se ha unido a tu grupo");
            assertThat(email.senderName()).isEqualTo("SecretMatch");
        });
    }

    @Test
    @DisplayName("the committing thread does not wait for the email to be sent")
    void commitDoesNotWaitForTheSend() {
        sender.holdSends();
        long start = System.nanoTime();

        transaction.executeWithoutResult(status -> events.publishEvent(JOINED));

        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
        sender.releaseSends();
        assertThat(sender.sent()).hasSize(1);
    }

    @Test
    @DisplayName("sends no email when the action rolls back")
    void sendsNothingOnRollback() {
        transaction.executeWithoutResult(status -> {
            events.publishEvent(JOINED);
            status.setRollbackOnly();
        });

        assertThat(sender.sent()).isEmpty();
    }

    @Test
    @DisplayName("sends without waiting when published outside a transaction, as nothing can roll back")
    void sendsWithoutTransaction() {
        sender.holdSends();

        events.publishEvent(JOINED);

        sender.releaseSends();
        assertThat(sender.sent()).hasSize(1);
    }

    @Test
    @DisplayName("a failed send does not fail the action and is logged without personal data")
    void failedSendIsLoggedWithoutPersonalData(CapturedOutput output) {
        // What a careless client library might do: put the recipient and content in the error.
        sender.failSendsWith(
                new IllegalStateException("rejected ana.garcia@example.com: Luis Pérez ya forma parte de Navidad"));

        assertThatNoException()
                .isThrownBy(() -> transaction.executeWithoutResult(status -> events.publishEvent(JOINED)));

        assertThat(sender.sent()).isEmpty();
        assertThat(output.getOut())
                .contains("Email not delivered")
                .doesNotContain("ana.garcia")
                .doesNotContain("example.com")
                .doesNotContain("Luis Pérez")
                .doesNotContain("Navidad");
    }

    @Test
    @DisplayName("logs the provider's reason when it is known to be safe")
    void logsSafeProviderReason(CapturedOutput output) {
        sender.failSendsWith(new EmailDeliveryException("Resend answered HTTP 422"));

        transaction.executeWithoutResult(status -> events.publishEvent(JOINED));

        assertThat(sender.sent()).isEmpty();
        assertThat(output.getOut()).contains("Email not delivered: Resend answered HTTP 422");
    }

    @Test
    @DisplayName("an email the full queue rejects is dropped and logged without personal data, the action goes on")
    void rejectedEmailIsLoggedWithoutPersonalData(CapturedOutput output) {
        sender.holdSends();

        assertThatNoException()
                .isThrownBy(() -> IntStream.range(0, MORE_THAN_THE_EXECUTOR_HOLDS)
                        .forEach(i -> transaction.executeWithoutResult(status -> events.publishEvent(JOINED))));
        assertThatNoException().as("published outside a transaction too").isThrownBy(() -> events.publishEvent(JOINED));

        sender.releaseSends();
        assertThat(sender.sent()).hasSizeBetween(1, MORE_THAN_THE_EXECUTOR_HOLDS - 1);
        assertThat(output.getOut())
                .contains("Email not delivered (queue full)")
                .doesNotContain("ana.garcia")
                .doesNotContain("example.com")
                .doesNotContain("Luis Pérez")
                .doesNotContain("Navidad");
    }
}
