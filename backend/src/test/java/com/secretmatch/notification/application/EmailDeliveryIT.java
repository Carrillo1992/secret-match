package com.secretmatch.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

import com.secretmatch.TestPostgres;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

/** Emails go out only after the business transaction commits, and never break it (architecture §2.5). */
@SpringBootTest
@ActiveProfiles("test")
@Import({TestPostgres.class, EmailDeliveryIT.FakeSenderConfig.class})
@ExtendWith(OutputCaptureExtension.class)
class EmailDeliveryIT {

    private static final EmailRequested JOINED = new EmailRequested(
            "ana.garcia@example.com",
            "Luis Pérez se ha unido a tu grupo",
            "Luis Pérez ya forma parte de Navidad.",
            "/");

    @Autowired
    ApplicationEventPublisher events;

    @Autowired
    TransactionTemplate transaction;

    @Autowired
    FakeSender sender;

    @BeforeEach
    void reset() {
        sender.sent.clear();
        sender.failure = null;
    }

    @Test
    @DisplayName("sends the email once the transaction commits")
    void sendsAfterCommit() {
        transaction.executeWithoutResult(status -> {
            events.publishEvent(JOINED);
            assertThat(sender.sent).as("nothing is sent before the commit").isEmpty();
        });

        assertThat(sender.sent).singleElement().satisfies(email -> {
            assertThat(email.to()).isEqualTo("ana.garcia@example.com");
            assertThat(email.subject()).isEqualTo("Luis Pérez se ha unido a tu grupo");
            assertThat(email.senderName()).isEqualTo("SecretMatch");
        });
    }

    @Test
    @DisplayName("sends no email when the action rolls back")
    void sendsNothingOnRollback() {
        transaction.executeWithoutResult(status -> {
            events.publishEvent(JOINED);
            status.setRollbackOnly();
        });

        assertThat(sender.sent).isEmpty();
    }

    @Test
    @DisplayName("sends right away when published outside a transaction, as nothing can roll back")
    void sendsWithoutTransaction() {
        events.publishEvent(JOINED);

        assertThat(sender.sent).hasSize(1);
    }

    @Test
    @DisplayName("a failed send does not fail the action and is logged without personal data")
    void failedSendIsLoggedWithoutPersonalData(CapturedOutput output) {
        // What a careless client library might do: put the recipient and content in the error.
        sender.failure =
                new IllegalStateException("rejected ana.garcia@example.com: Luis Pérez ya forma parte de Navidad");

        assertThatNoException()
                .isThrownBy(() -> transaction.executeWithoutResult(status -> events.publishEvent(JOINED)));

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
        sender.failure = new EmailDeliveryException("Resend answered HTTP 422");

        transaction.executeWithoutResult(status -> events.publishEvent(JOINED));

        assertThat(output.getOut()).contains("Email not delivered: Resend answered HTTP 422");
    }

    static class FakeSender implements EmailSender {

        final List<OutgoingEmail> sent = new CopyOnWriteArrayList<>();
        volatile RuntimeException failure;

        @Override
        public void send(OutgoingEmail email) {
            if (failure != null) {
                throw failure;
            }
            sent.add(email);
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FakeSenderConfig {

        @Bean
        @Primary
        FakeSender fakeSender() {
            return new FakeSender();
        }
    }
}
