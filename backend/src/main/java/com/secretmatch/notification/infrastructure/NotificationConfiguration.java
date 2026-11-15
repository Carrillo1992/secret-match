package com.secretmatch.notification.infrastructure;

import com.secretmatch.notification.application.EmailDelivery;
import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.MailProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.SmartLifecycle;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

/**
 * Resend in {@code prod}; the local mail catcher everywhere else, so nothing is really delivered. Emails go
 * out on a small, bounded executor of their own, off the request thread (docs/architecture.md §2.5).
 */
@Configuration(proxyBeanMethods = false)
@EnableAsync
@EnableConfigurationProperties(MailProperties.class)
class NotificationConfiguration {

    /** Few emails go out at once on the free host; two threads keep one slow send from blocking the rest. */
    private static final int EMAIL_THREADS = 2;

    /** Beyond this many emails waiting, a new one is dropped and logged (see {@link DroppedEmailLogger}). */
    private static final int EMAIL_QUEUE_CAPACITY = 100;

    /** On shutdown, how long the queued emails get before the app stops anyway. */
    private static final Duration EMAIL_SHUTDOWN_GRACE = Duration.ofSeconds(10);

    /**
     * Below the web server's graceful shutdown ({@code DEFAULT_PHASE - 1024}) and its stop ({@code - 2048}):
     * the executor stops taking emails only after the last request has finished and queued its own.
     */
    private static final int EMAIL_EXECUTOR_PHASE = SmartLifecycle.DEFAULT_PHASE - 4096;

    /** A slow provider holds an email thread, never a request, but it must not hold it for long either. */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    @Profile("prod")
    EmailSender resendEmailSender(@Value("${secretmatch.mail.resend.api-key}") String apiKey) {
        return new ResendEmailSender(restClient(), apiKey);
    }

    @Bean
    @Profile("!prod")
    EmailSender mailpitEmailSender(@Value("${secretmatch.mail.mailpit.url}") URI url) {
        return new MailpitEmailSender(restClient(), url);
    }

    @Bean(EmailDelivery.EXECUTOR)
    ThreadPoolTaskExecutor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("email-");
        executor.setCorePoolSize(EMAIL_THREADS);
        executor.setMaxPoolSize(EMAIL_THREADS);
        executor.setQueueCapacity(EMAIL_QUEUE_CAPACITY);
        executor.setRejectedExecutionHandler(new DroppedEmailLogger());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationMillis(EMAIL_SHUTDOWN_GRACE.toMillis());
        executor.setPhase(EMAIL_EXECUTOR_PHASE);
        return executor;
    }

    private static RestClient.Builder restClient() {
        HttpClient client =
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(client);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(requestFactory);
    }
}
