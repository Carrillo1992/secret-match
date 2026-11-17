package com.secretmatch.notification.domain;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/**
 * Where to push to one browser on one device, as its Push API hands it over: the push service's endpoint, and the
 * browser's public key ({@code p256dh}) and authentication secret ({@code auth}) the message is encrypted with.
 *
 * <p>The API posts to the endpoint, so it must be one of the browsers' push services, over HTTPS: anything else
 * would let a caller make the API send requests wherever they like.
 */
public record PushSubscription(URI endpoint, String p256dh, String auth) {

    /** The push services of Chrome and Android, Firefox, Safari and Edge; a host matches itself or a subdomain. */
    static final List<String> PUSH_SERVICES =
            List.of("fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com");

    public static final int MAX_ENDPOINT_LENGTH = 1000;
    private static final int P256DH_LENGTH = 65;
    private static final int AUTH_LENGTH = 16;

    public PushSubscription {
        if (endpoint == null || !isPushService(endpoint) || endpoint.toString().length() > MAX_ENDPOINT_LENGTH) {
            throw new InvalidPushSubscriptionException();
        }
        if (decodedLength(p256dh) != P256DH_LENGTH || decodedLength(auth) != AUTH_LENGTH) {
            throw new InvalidPushSubscriptionException();
        }
    }

    /**
     * @throws InvalidPushSubscriptionException if the endpoint is not an HTTPS URL of a known push service, or a key
     *     is not what the Push API produces
     */
    public static PushSubscription of(String endpoint, String p256dh, String auth) {
        return new PushSubscription(parsed(endpoint), p256dh, auth);
    }

    /** @throws InvalidPushSubscriptionException if {@code endpoint} is not a URL */
    public static URI parsed(String endpoint) {
        if (endpoint == null) {
            throw new InvalidPushSubscriptionException();
        }
        try {
            return new URI(endpoint);
        } catch (URISyntaxException e) {
            throw new InvalidPushSubscriptionException();
        }
    }

    private static boolean isPushService(URI endpoint) {
        String host = endpoint.getHost();
        if (!"https".equals(endpoint.getScheme())
                || host == null
                || endpoint.getUserInfo() != null
                || (endpoint.getPort() != -1 && endpoint.getPort() != 443)) {
            return false;
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        return PUSH_SERVICES.stream()
                .anyMatch(service -> lowerHost.equals(service) || lowerHost.endsWith("." + service));
    }

    private static int decodedLength(String base64url) {
        if (base64url == null) {
            return -1;
        }
        try {
            return Base64.getUrlDecoder().decode(base64url).length;
        } catch (IllegalArgumentException e) {
            return -1;
        }
    }
}
