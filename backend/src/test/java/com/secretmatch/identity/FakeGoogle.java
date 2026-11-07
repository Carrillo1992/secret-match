package com.secretmatch.identity;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Stands in for Google in tests: signs ID tokens with an RSA key generated on the spot and serves its public
 * half as a JWK set on localhost, so no test ever talks to real Google.
 */
public final class FakeGoogle {

    public static final String CLIENT_ID = "secretmatch-test.apps.googleusercontent.com";
    private static final String KEY_ID = "fake-google-key";

    private static final FakeGoogle INSTANCE = new FakeGoogle();

    private final RSAKey key = newKey();
    /** Another key with the same id: what it signs carries a signature the published key does not verify. */
    private final RSAKey strangerKey = newKey();

    private final HttpServer server;

    private FakeGoogle() {
        String jwkSet = new JWKSet(key.toPublicJWK()).toString();
        try {
            server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        server.createContext("/oauth2/v3/certs", exchange -> {
            byte[] body = jwkSet.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
    }

    public static FakeGoogle instance() {
        return INSTANCE;
    }

    public String jwkSetUri() {
        return "http://" + server.getAddress().getHostString() + ":"
                + server.getAddress().getPort() + "/oauth2/v3/certs";
    }

    /**
     * An ID token as Google issues it for our client, valid from {@code now} for an hour, with whatever the
     * test changes on top.
     */
    public String idToken(
            Instant now, String subject, String email, String name, Consumer<JwtClaimsSet.Builder> changes) {
        return sign(key, claims(now, subject, email, name, changes));
    }

    public String idToken(Instant now, String subject, String email, String name) {
        return idToken(now, subject, email, name, claims -> {});
    }

    /** A token that looks like Google's but is signed with a key Google never published. */
    public String idTokenSignedByStranger(Instant now, String subject, String email, String name) {
        return sign(strangerKey, claims(now, subject, email, name, claims -> {}));
    }

    private static JwtClaimsSet claims(
            Instant now, String subject, String email, String name, Consumer<JwtClaimsSet.Builder> changes) {
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("https://accounts.google.com")
                .audience(List.of(CLIENT_ID))
                .subject(subject)
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofHours(1)))
                .claim("email", email)
                .claim("email_verified", true);
        if (name != null) {
            claims.claim("name", name);
        }
        changes.accept(claims);
        return claims.build();
    }

    private static String sign(RSAKey signingKey, JwtClaimsSet claims) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)));
        JwsHeader header =
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(KEY_ID).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private static RSAKey newKey() {
        try {
            return new RSAKeyGenerator(2048).keyID(KEY_ID).generate();
        } catch (com.nimbusds.jose.JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
