package com.secretmatch.notification.infrastructure.push;

import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.util.Arrays;

/**
 * The P-256 keys Web Push uses, in the raw forms it sends them: a public key as the 65-byte uncompressed point
 * ({@code 0x04 | x | y}), a private key as its 32-byte scalar. Only the JDK's own providers.
 */
final class P256 {

    static final int UNCOMPRESSED_LENGTH = 65;
    private static final int COORDINATE_LENGTH = 32;
    private static final ECParameterSpec CURVE = curve();

    private P256() {}

    static KeyPair newKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(new ECGenParameterSpec("secp256r1"));
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 is not available", e);
        }
    }

    /** The key pair given by its raw private scalar and uncompressed public point. */
    static KeyPair keyPair(byte[] rawPrivate, byte[] uncompressedPublic) {
        try {
            KeyFactory factory = KeyFactory.getInstance("EC");
            ECPrivateKeySpec privateSpec = new ECPrivateKeySpec(new BigInteger(1, rawPrivate), CURVE);
            return new KeyPair(publicKey(uncompressedPublic), factory.generatePrivate(privateSpec));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("not a P-256 private key", e);
        }
    }

    /** @throws IllegalArgumentException if the bytes are not an uncompressed point on P-256 */
    static ECPublicKey publicKey(byte[] uncompressed) {
        if (uncompressed.length != UNCOMPRESSED_LENGTH || uncompressed[0] != 0x04) {
            throw new IllegalArgumentException("not an uncompressed P-256 point");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(uncompressed, 1, 1 + COORDINATE_LENGTH));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(uncompressed, 1 + COORDINATE_LENGTH, UNCOMPRESSED_LENGTH));
        try {
            return (ECPublicKey)
                    KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), CURVE));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("not a P-256 public key", e);
        }
    }

    static byte[] uncompressed(ECPublicKey key) {
        byte[] point = new byte[UNCOMPRESSED_LENGTH];
        point[0] = 0x04;
        copyUnsigned(key.getW().getAffineX(), point, 1);
        copyUnsigned(key.getW().getAffineY(), point, 1 + COORDINATE_LENGTH);
        return point;
    }

    /** {@code value} as exactly 32 big-endian bytes, at {@code offset}. */
    private static void copyUnsigned(BigInteger value, byte[] target, int offset) {
        byte[] bytes = value.toByteArray();
        int start = Math.max(0, bytes.length - COORDINATE_LENGTH);
        int length = bytes.length - start;
        System.arraycopy(bytes, start, target, offset + COORDINATE_LENGTH - length, length);
    }

    private static ECParameterSpec curve() {
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            return parameters.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 is not available", e);
        }
    }
}
