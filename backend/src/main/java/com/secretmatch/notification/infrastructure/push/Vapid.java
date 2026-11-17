package com.secretmatch.notification.infrastructure.push;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Pattern;

/**
 * Identifies SecretMatch to the push services (VAPID, RFC 8292): every push request carries a short-lived token
 * signed with our private key, and the browser only accepts pushes signed with the public key it subscribed with.
 */
class Vapid {

    /** Well under the 24 hours push services accept. */
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(12);

    /** A contact the push services can reach: no characters that would need escaping in the token. */
    private static final Pattern SUBJECT = Pattern.compile("(mailto:|https://)[^\"\\\\\\s]+");

    private static final Base64.Decoder BASE64URL = Base64.getUrlDecoder();
    private static final Base64.Encoder TO_BASE64URL = Base64.getUrlEncoder().withoutPadding();
    private static final String HEADER =
            TO_BASE64URL.encodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.US_ASCII));

    private final String publicKey;
    private final KeyPair keys;
    private final String subject;

    /**
     * @param publicKey the uncompressed P-256 point, base64url: what the browsers subscribe with
     * @param privateKey its private scalar, base64url
     * @param subject a {@code mailto:} or {@code https:} contact for the push services
     * @throws IllegalArgumentException if a key is malformed, the two do not belong together, or the subject is not
     *     a contact
     */
    Vapid(String publicKey, String privateKey, String subject) {
        if (subject == null || !SUBJECT.matcher(subject).matches()) {
            throw new IllegalArgumentException("the VAPID subject must be a mailto: or https: URL");
        }
        this.keys = P256.keyPair(BASE64URL.decode(privateKey), BASE64URL.decode(publicKey));
        this.publicKey = TO_BASE64URL.encodeToString(P256.uncompressed((ECPublicKey) keys.getPublic()));
        this.subject = subject;
        if (!belongTogether(keys)) {
            throw new IllegalArgumentException("the VAPID private key does not belong to the public key");
        }
    }

    /** The public key, base64url, as browsers pass it to {@code pushManager.subscribe}. */
    String publicKey() {
        return publicKey;
    }

    /** The {@code Authorization} header for a push request to {@code endpoint}. */
    String authorization(URI endpoint, Instant now) {
        String claims = "{\"aud\":\"%s\",\"exp\":%d,\"sub\":\"%s\"}"
                .formatted(origin(endpoint), now.plus(TOKEN_LIFETIME).getEpochSecond(), subject);
        String signed = HEADER + "." + TO_BASE64URL.encodeToString(claims.getBytes(StandardCharsets.UTF_8));
        return "vapid t=" + signed + "." + TO_BASE64URL.encodeToString(sign(keys, signed)) + ", k=" + publicKey;
    }

    private static String origin(URI endpoint) {
        String origin = endpoint.getScheme() + "://" + endpoint.getHost();
        return endpoint.getPort() == -1 ? origin : origin + ":" + endpoint.getPort();
    }

    private static byte[] sign(KeyPair keys, String content) {
        try {
            Signature signature = Signature.getInstance("SHA256withECDSAinP1363Format");
            signature.initSign(keys.getPrivate());
            signature.update(content.getBytes(StandardCharsets.US_ASCII));
            return signature.sign();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("VAPID token not signed", e);
        }
    }

    private static boolean belongTogether(KeyPair keys) {
        String probe = "secretmatch";
        try {
            Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
            verifier.initVerify(keys.getPublic());
            verifier.update(probe.getBytes(StandardCharsets.US_ASCII));
            return verifier.verify(sign(keys, probe));
        } catch (GeneralSecurityException e) {
            return false;
        }
    }
}
