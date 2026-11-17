package com.secretmatch.notification.infrastructure.push;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.SecureRandom;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Encrypts a push message for one browser subscription (RFC 8291, with the {@code aes128gcm} content coding of RFC
 * 8188): only that browser can read it, so the push service in between never sees the text. One record, a new
 * key pair and salt per message.
 */
class WebPushEncryption {

    /** The record size the header announces; a push message is far smaller, so it is always one record. */
    private static final int RECORD_SIZE = 4096;

    private static final int SALT_LENGTH = 16;
    private static final int KEY_LENGTH = 16;
    private static final int NONCE_LENGTH = 12;
    private static final int TAG_BITS = 128;

    /** The delimiter after the last (here, only) record's content. */
    private static final byte LAST_RECORD = 0x02;

    private final SecureRandom random = new SecureRandom();

    /**
     * @param subscriberKey the browser's public key ({@code p256dh}), as an uncompressed point
     * @param authSecret the browser's authentication secret ({@code auth}), 16 bytes
     * @return the message body to post to the subscription's endpoint
     */
    byte[] encrypt(byte[] plaintext, byte[] subscriberKey, byte[] authSecret) {
        byte[] salt = new byte[SALT_LENGTH];
        random.nextBytes(salt);
        return encrypt(plaintext, subscriberKey, authSecret, P256.newKeyPair(), salt);
    }

    /** With the server's key pair and the salt given, as in the RFC's example. */
    static byte[] encrypt(byte[] plaintext, byte[] subscriberKey, byte[] authSecret, KeyPair server, byte[] salt) {
        if (plaintext.length + 1 + TAG_BITS / 8 > RECORD_SIZE) {
            throw new IllegalArgumentException("a push message must fit in one record");
        }
        try {
            ECPublicKey subscriber = P256.publicKey(subscriberKey);
            byte[] serverPublic = P256.uncompressed((ECPublicKey) server.getPublic());

            KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
            agreement.init(server.getPrivate());
            agreement.doPhase(subscriber, true);
            byte[] ecdhSecret = agreement.generateSecret();

            byte[] keyInfo = concat(ascii("WebPush: info\0"), subscriberKey, serverPublic);
            byte[] ikm = hkdf(authSecret, ecdhSecret, keyInfo, 32);
            byte[] prk = hmac(salt, ikm);
            byte[] contentKey = expand(prk, ascii("Content-Encoding: aes128gcm\0"), KEY_LENGTH);
            byte[] nonce = expand(prk, ascii("Content-Encoding: nonce\0"), NONCE_LENGTH);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.ENCRYPT_MODE, new SecretKeySpec(contentKey, "AES"), new GCMParameterSpec(TAG_BITS, nonce));
            byte[] record = cipher.doFinal(concat(plaintext, new byte[] {LAST_RECORD}));

            ByteBuffer header = ByteBuffer.allocate(SALT_LENGTH + 4 + 1 + serverPublic.length);
            header.put(salt).putInt(RECORD_SIZE).put((byte) serverPublic.length).put(serverPublic);
            return concat(header.array(), record);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("push message not encrypted", e);
        }
    }

    /** HKDF (RFC 5869) with SHA-256, for an output of at most one hash. */
    private static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int length) throws GeneralSecurityException {
        return expand(hmac(salt, ikm), info, length);
    }

    private static byte[] expand(byte[] prk, byte[] info, int length) throws GeneralSecurityException {
        return Arrays.copyOf(hmac(prk, concat(info, new byte[] {0x01})), length);
    }

    private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }

    private static byte[] concat(byte[]... parts) {
        int length = 0;
        for (byte[] part : parts) {
            length += part.length;
        }
        ByteBuffer joined = ByteBuffer.allocate(length);
        for (byte[] part : parts) {
            joined.put(part);
        }
        return joined.array();
    }
}
