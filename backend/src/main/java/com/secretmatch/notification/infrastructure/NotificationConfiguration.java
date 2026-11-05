package com.secretmatch.notification.infrastructure;

import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.MailProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Resend in {@code prod}; the local mail catcher everywhere else, so nothing is really delivered. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(MailProperties.class)
class NotificationConfiguration {

    /** Emails are sent within the request, so a slow provider must not hold it for long. */
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

    private static RestClient.Builder restClient() {
        HttpClient client =
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(client);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(requestFactory);
    }
}
