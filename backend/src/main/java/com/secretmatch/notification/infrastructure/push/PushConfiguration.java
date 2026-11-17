package com.secretmatch.notification.infrastructure.push;

import com.secretmatch.notification.application.PushSender;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Web Push with the VAPID keys from the environment. They are required in {@code prod}; elsewhere, without them,
 * pushing is off and a push is only logged (#119).
 */
@Configuration(proxyBeanMethods = false)
class PushConfiguration {

    /** A slow push service holds an email-executor thread, never a request, but not for long either. */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    @Profile("prod")
    PushSender webPushSender(
            @Value("${secretmatch.push.vapid.public-key}") String publicKey,
            @Value("${secretmatch.push.vapid.private-key}") String privateKey,
            @Value("${secretmatch.push.vapid.subject}") String subject,
            Clock clock) {
        if (publicKey.isBlank() || privateKey.isBlank()) {
            throw new IllegalStateException(
                    "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in prod: notifications need them");
        }
        return webPush(publicKey, privateKey, subject, clock);
    }

    @Bean
    @Profile("!prod")
    PushSender localPushSender(
            @Value("${secretmatch.push.vapid.public-key}") String publicKey,
            @Value("${secretmatch.push.vapid.private-key}") String privateKey,
            @Value("${secretmatch.push.vapid.subject}") String subject,
            Clock clock) {
        if (publicKey.isBlank() || privateKey.isBlank()) {
            return new LoggingPushSender();
        }
        return webPush(publicKey, privateKey, subject, clock);
    }

    private static PushSender webPush(String publicKey, String privateKey, String subject, Clock clock) {
        return new WebPushSender(restClient(), new Vapid(publicKey, privateKey, subject), clock);
    }

    private static RestClient restClient() {
        HttpClient client =
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(client);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(requestFactory).build();
    }
}
