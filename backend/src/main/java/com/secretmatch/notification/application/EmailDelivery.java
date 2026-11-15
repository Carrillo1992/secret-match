package com.secretmatch.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends each {@link EmailRequested} once the transaction that published it has committed, on the email
 * executor rather than the request thread: how long a request takes must not tell whether an email went
 * out, and so whether an email has a User. A failed send is logged and dropped: it never undoes or fails
 * the business action, and there are no retries (docs/architecture.md §2.5).
 */
@Component
public class EmailDelivery {

    private static final Logger log = LoggerFactory.getLogger(EmailDelivery.class);

    private final BaseEmailTemplate template;
    private final EmailSender sender;

    EmailDelivery(BaseEmailTemplate template, EmailSender sender) {
        this.template = template;
        this.sender = sender;
    }

    /** The bounded executor emails are sent on; see {@code NotificationConfiguration}. */
    public static final String EXECUTOR = "emailExecutor";

    // Published outside a transaction there is nothing to roll back, so it is sent without waiting for
    // a commit instead of being silently dropped.
    @Async(EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void deliver(EmailRequested request) {
        try {
            sender.send(template.render(request));
        } catch (EmailDeliveryException e) {
            log.warn("Email not delivered: {}", e.getMessage());
        } catch (RuntimeException e) {
            // Only the exception type: its message and stack trace may carry addresses or content.
            log.warn("Email not delivered ({})", e.getClass().getName());
        }
    }
}
