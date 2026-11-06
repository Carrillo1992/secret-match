package com.secretmatch;

import com.secretmatch.notification.application.EmailSender;
import com.secretmatch.notification.application.OutgoingEmail;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Replaces the real {@link EmailSender} and keeps every email instead of sending it. Import {@link Config}
 * and autowire this class.
 */
public class RecordingEmailSender implements EmailSender {

    private final List<OutgoingEmail> sent = new CopyOnWriteArrayList<>();

    @Override
    public void send(OutgoingEmail email) {
        sent.add(email);
    }

    public List<OutgoingEmail> sent() {
        return List.copyOf(sent);
    }

    public List<OutgoingEmail> sentTo(String address) {
        return sent.stream().filter(email -> email.to().equals(address)).toList();
    }

    public void clear() {
        sent.clear();
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Config {

        @Bean
        @Primary
        RecordingEmailSender recordingEmailSender() {
            return new RecordingEmailSender();
        }
    }
}
