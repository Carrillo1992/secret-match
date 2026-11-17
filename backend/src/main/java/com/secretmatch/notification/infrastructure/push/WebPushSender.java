package com.secretmatch.notification.infrastructure.push;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.secretmatch.notification.application.PushDeliveryException;
import com.secretmatch.notification.application.PushMessage;
import com.secretmatch.notification.application.PushSender;
import com.secretmatch.notification.domain.PushSubscription;
import java.time.Clock;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * Sends a push through the browser's push service (RFC 8030), encrypted for that browser (RFC 8291) and signed
 * with our VAPID key (RFC 8292). The payload is what Angular's service worker shows as a notification, and a tap
 * opens or focuses the app on the push's page.
 */
class WebPushSender implements PushSender {

    /** The app's icon, served by the SPA next to the service worker. */
    private static final String ICON = "/icons/icon-192.png";

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final RestClient http;
    private final Vapid vapid;
    private final WebPushEncryption encryption = new WebPushEncryption();
    private final Clock clock;

    WebPushSender(RestClient http, Vapid vapid, Clock clock) {
        this.http = http;
        this.vapid = vapid;
        this.clock = clock;
    }

    @Override
    public Optional<String> publicKey() {
        return Optional.of(vapid.publicKey());
    }

    @Override
    public Delivery send(PushSubscription to, PushMessage message) {
        Base64.Decoder base64url = Base64.getUrlDecoder();
        byte[] body = encryption.encrypt(
                JSON.writeValueAsBytes(NgswPayload.of(message)),
                base64url.decode(to.p256dh()),
                base64url.decode(to.auth()));
        int status = http.post()
                .uri(to.endpoint())
                .header(HttpHeaders.AUTHORIZATION, vapid.authorization(to.endpoint(), clock.instant()))
                .header(HttpHeaders.CONTENT_ENCODING, "aes128gcm")
                .header("TTL", Long.toString(message.timeToLive().toSeconds()))
                .header("Urgency", message.urgency().name().toLowerCase(Locale.ROOT))
                .header("Topic", message.topic())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(body)
                .exchange((request, response) -> response.getStatusCode().value());
        if (status == 404 || status == 410) {
            return Delivery.SUBSCRIPTION_GONE;
        }
        if (status < 200 || status >= 300) {
            // The response body can echo the endpoint, so only the status is reported.
            throw new PushDeliveryException("push service answered HTTP " + status);
        }
        return Delivery.ACCEPTED;
    }

    /** What {@code SwPush} expects: {@code notification} holds the {@code showNotification} options. */
    record NgswPayload(Notification notification) {

        static NgswPayload of(PushMessage message) {
            return new NgswPayload(new Notification(
                    message.title(),
                    message.body(),
                    ICON,
                    message.topic(),
                    true,
                    new Data(new OnActionClick(new Action("navigateLastFocusedOrOpen", message.linkPath())))));
        }

        record Notification(String title, String body, String icon, String tag, boolean renotify, Data data) {}

        record Data(OnActionClick onActionClick) {}

        /** {@code default}: a tap on the notification itself rather than on one of its actions. */
        record OnActionClick(@JsonProperty("default") Action defaultAction) {}

        record Action(String operation, String url) {}
    }
}
