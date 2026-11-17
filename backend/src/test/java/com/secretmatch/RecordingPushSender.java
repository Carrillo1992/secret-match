package com.secretmatch;

import com.secretmatch.notification.application.PushMessage;
import com.secretmatch.notification.application.PushSender;
import com.secretmatch.notification.domain.PushSubscription;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

/**
 * Replaces the real {@link PushSender} and keeps every push instead of sending it. Import {@link Config} and
 * autowire this class. Pushes go out on the email executor, so every read first waits until it is idle, like
 * {@link RecordingEmailSender}.
 */
public class RecordingPushSender implements PushSender {

    /** Any well-formed key: nothing is really pushed. */
    public static final String PUBLIC_KEY =
            "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";

    /** One push handed to the push service. */
    public record Push(URI endpoint, PushMessage message) {}

    private final ObjectProvider<RecordingEmailSender> executorWatch;
    private final List<Push> sent = new CopyOnWriteArrayList<>();
    private final Set<URI> gone = ConcurrentHashMap.newKeySet();
    private volatile RuntimeException failure;

    RecordingPushSender(ObjectProvider<RecordingEmailSender> executorWatch) {
        this.executorWatch = executorWatch;
    }

    @Override
    public Optional<String> publicKey() {
        return Optional.of(PUBLIC_KEY);
    }

    @Override
    public Delivery send(PushSubscription to, PushMessage message) {
        if (gone.contains(to.endpoint())) {
            return Delivery.SUBSCRIPTION_GONE;
        }
        RuntimeException toThrow = failure;
        if (toThrow != null) {
            throw toThrow;
        }
        sent.add(new Push(to.endpoint(), message));
        return Delivery.ACCEPTED;
    }

    public List<Push> sent() {
        executorWatch.getObject().awaitIdle();
        return List.copyOf(sent);
    }

    public List<Push> sentTo(URI endpoint) {
        return sent().stream().filter(push -> push.endpoint().equals(endpoint)).toList();
    }

    /** From now on the push service answers that this subscription no longer exists. */
    public void forget(URI endpoint) {
        gone.add(endpoint);
    }

    /** Every send from now on throws this instead of keeping the push, like a push service that refuses it. */
    public void failSendsWith(RuntimeException failure) {
        this.failure = failure;
    }

    /** Waits for the pushes still on their way, then forgets them all and any gone or failing subscription. */
    public void clear() {
        executorWatch.getObject().awaitIdle();
        sent.clear();
        gone.clear();
        failure = null;
    }

    @TestConfiguration(proxyBeanMethods = false)
    @Import(RecordingEmailSender.Config.class)
    public static class Config {

        @Bean
        @Primary
        RecordingPushSender recordingPushSender(ObjectProvider<RecordingEmailSender> emails) {
            return new RecordingPushSender(emails);
        }
    }
}
