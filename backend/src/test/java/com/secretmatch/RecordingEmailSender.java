package com.secretmatch;

import com.secretmatch.notification.application.EmailDelivery;
import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.OutgoingEmail;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Replaces the real {@link EmailSender} and keeps every email instead of sending it. Import {@link Config}
 * and autowire this class.
 *
 * <p>Emails are sent off the request thread (docs/architecture.md §2.5), so every read first waits until no
 * email is queued or being sent: an action's emails are all there, and "no email" really means none will
 * come. That wait ends as soon as the last send does, it is not a fixed sleep.
 */
public class RecordingEmailSender implements EmailSender {

    private static final Duration WAIT_LIMIT = Duration.ofSeconds(10);

    private final List<OutgoingEmail> sent = new CopyOnWriteArrayList<>();
    private final InFlight inFlight = new InFlight();
    private volatile CountDownLatch gate = new CountDownLatch(0);
    private volatile RuntimeException failure;

    @Override
    public void send(OutgoingEmail email) {
        awaitGate();
        RuntimeException toThrow = failure;
        if (toThrow != null) {
            throw toThrow;
        }
        sent.add(email);
    }

    public List<OutgoingEmail> sent() {
        inFlight.awaitNone();
        return List.copyOf(sent);
    }

    public List<OutgoingEmail> sentTo(String address) {
        return sent().stream().filter(email -> email.to().equals(address)).toList();
    }

    /** Waits for the emails still on their way, then forgets every email and any held or failing send. */
    public void clear() {
        releaseSends();
        inFlight.awaitNone();
        failure = null;
        sent.clear();
    }

    /** Every send from now on blocks until {@link #releaseSends()}, like a provider that does not answer. */
    public void holdSends() {
        gate = new CountDownLatch(1);
    }

    public void releaseSends() {
        gate.countDown();
    }

    /** Every send from now on throws this instead of keeping the email, like a provider that refuses it. */
    public void failSendsWith(RuntimeException failure) {
        this.failure = failure;
    }

    private void awaitGate() {
        try {
            if (!gate.await(WAIT_LIMIT.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new IllegalStateException("a held send was never released");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    /** Counts the email tasks handed to the executor that have not finished or been rejected yet. */
    private static final class InFlight {

        private int count;

        synchronized void started() {
            count++;
        }

        synchronized void ended() {
            count--;
            notifyAll();
        }

        synchronized void awaitNone() {
            long deadline = System.nanoTime() + WAIT_LIMIT.toNanos();
            try {
                while (count > 0) {
                    long left = deadline - System.nanoTime();
                    if (left <= 0) {
                        throw new IllegalStateException("emails still being sent after " + WAIT_LIMIT);
                    }
                    TimeUnit.NANOSECONDS.timedWait(this, left);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Config {

        @Bean
        @Primary
        RecordingEmailSender recordingEmailSender() {
            return new RecordingEmailSender();
        }

        /** Lets the recorder see every email task the email executor takes on, runs or rejects. */
        @Bean
        static BeanPostProcessor emailTaskTracking(ObjectProvider<RecordingEmailSender> recorder) {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessBeforeInitialization(Object bean, String beanName) {
                    if (bean instanceof ThreadPoolTaskExecutor executor && beanName.equals(EmailDelivery.EXECUTOR)) {
                        executor.setTaskDecorator(task -> {
                            InFlight inFlight = recorder.getObject().inFlight;
                            inFlight.started();
                            return () -> {
                                try {
                                    task.run();
                                } finally {
                                    inFlight.ended();
                                }
                            };
                        });
                    }
                    return bean;
                }

                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) {
                    if (bean instanceof ThreadPoolTaskExecutor executor && beanName.equals(EmailDelivery.EXECUTOR)) {
                        ThreadPoolExecutor pool = executor.getThreadPoolExecutor();
                        RejectedExecutionHandler rejecting = pool.getRejectedExecutionHandler();
                        pool.setRejectedExecutionHandler((task, rejectedBy) -> {
                            try {
                                rejecting.rejectedExecution(task, rejectedBy);
                            } finally {
                                recorder.getObject().inFlight.ended();
                            }
                        });
                    }
                    return bean;
                }
            };
        }
    }
}
