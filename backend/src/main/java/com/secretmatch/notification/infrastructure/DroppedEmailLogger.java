package com.secretmatch.notification.infrastructure;

import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * What the email executor does with an email when its queue is full: drops it and logs it like a failed
 * send, without personal data. Running it on the caller's thread instead would make that request wait for
 * the send again, and throwing would fail an action whose transaction has already committed.
 */
class DroppedEmailLogger implements RejectedExecutionHandler {

    private static final Logger log = LoggerFactory.getLogger(DroppedEmailLogger.class);

    @Override
    public void rejectedExecution(Runnable email, ThreadPoolExecutor executor) {
        log.warn("Email not delivered (queue full)");
    }
}
