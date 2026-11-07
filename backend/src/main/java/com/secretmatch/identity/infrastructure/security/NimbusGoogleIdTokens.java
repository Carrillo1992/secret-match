package com.secretmatch.identity.infrastructure.security;

import com.secretmatch.identity.application.GoogleIdTokens;
import com.secretmatch.identity.application.GoogleIdentity;
import com.secretmatch.identity.domain.EmailAddress;
import com.secretmatch.identity.domain.GoogleSignInRejectedException;
import com.secretmatch.identity.domain.GoogleSubject;
import com.secretmatch.identity.domain.InvalidUserDetailsException;
import java.time.Clock;
import java.util.Objects;
import java.util.Set;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtAudienceValidator;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Checks Google ID tokens as Google documents it: an RS256 signature by one of Google's published keys,
 * Google as the issuer, our client id as the audience, not expired (with the usual minute of clock skew), and
 * a verified email. Google's keys are fetched on first use and cached.
 */
@Component
class NimbusGoogleIdTokens implements GoogleIdTokens {

    private static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    /** {@code null} when Google sign-in is off: no client id was configured. */
    private final JwtDecoder decoder;

    NimbusGoogleIdTokens(GoogleProperties properties, Clock clock) {
        this.decoder = properties.enabled() ? decoder(properties, clock) : null;
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        if (decoder == null || idToken == null || idToken.isBlank()) {
            throw new GoogleSignInRejectedException();
        }
        try {
            Jwt jwt = decoder.decode(idToken);
            return new GoogleIdentity(
                    new GoogleSubject(jwt.getSubject()),
                    new EmailAddress(jwt.getClaimAsString("email")),
                    jwt.getClaimAsString("name"));
        } catch (BadJwtException | InvalidUserDetailsException e) {
            throw new GoogleSignInRejectedException();
        } catch (JwtException e) {
            // Not the token's fault: Google's keys could not be fetched. Answered as a 500, so the SPA
            // asks to try again instead of saying Google could not confirm who they are.
            throw new IllegalStateException("Google's signing keys are unavailable", e);
        }
    }

    private static JwtDecoder decoder(GoogleProperties properties, Clock clock) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.jwkSetUri())
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        JwtTimestampValidator expiry = new JwtTimestampValidator();
        expiry.setClock(clock);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                expiry,
                new JwtClaimValidator<Object>(
                        JwtClaimNames.ISS, issuer -> issuer != null && ISSUERS.contains(issuer.toString())),
                new JwtAudienceValidator(properties.clientId()),
                new JwtClaimValidator<Object>(JwtClaimNames.EXP, Objects::nonNull),
                new JwtClaimValidator<Object>(
                        "email_verified", verified -> Boolean.TRUE.equals(verified) || "true".equals(verified))));
        return decoder;
    }
}
