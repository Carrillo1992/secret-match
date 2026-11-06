package com.secretmatch.identity.infrastructure.security;

import com.secretmatch.identity.application.AccessToken;
import com.secretmatch.identity.application.AccessTokens;
import com.secretmatch.identity.domain.UserId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

/** Access tokens as JWTs signed with HS256: the subject is the User's id, and nothing else about them. */
@Component
class JwtAccessTokens implements AccessTokens {

    static final String ISSUER = "secretmatch";
    static final Duration VALIDITY = Duration.ofMinutes(15);

    private final JwtEncoder encoder;
    private final Clock clock;

    JwtAccessTokens(JwtEncoder encoder, Clock clock) {
        this.encoder = encoder;
        this.clock = clock;
    }

    @Override
    public AccessToken issueFor(UserId userId) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(VALIDITY);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(userId.value().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String value = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AccessToken(value, expiresAt);
    }
}
