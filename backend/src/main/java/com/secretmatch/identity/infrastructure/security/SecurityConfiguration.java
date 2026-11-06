package com.secretmatch.identity.infrastructure.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Clock;
import java.time.Duration;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Stateless authentication with our own JWT access tokens (docs/architecture.md §2.4). Being signed in is
 * all this checks; whether a User may touch a Group is decided by the use cases.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(JwtProperties.class)
class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        ProblemAuthenticationEntryPoint unauthenticated = new ProblemAuthenticationEntryPoint();
        return http
                // No cookie authenticates a request except the refresh token, whose endpoints only
                // rotate or end a session: there is nothing for a cross-site request to forge.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(requests -> requests
                        // Sign-up and email verification (#14).
                        .requestMatchers(HttpMethod.POST, "/api/v1/sign-ups", "/api/v1/sign-ups/*/verification-emails")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/verification-emails", "/api/v1/email-verifications")
                        .permitAll()
                        // Sessions are opened with a password and kept or ended with the refresh cookie.
                        .requestMatchers(HttpMethod.POST, "/api/v1/sessions", "/api/v1/sessions/refresh")
                        .permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/sessions/current")
                        .permitAll()
                        // Only exposed actuator endpoints exist (application.yml), today just health.
                        .requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**")
                        .permitAll()
                        .requestMatchers("/error")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .oauth2ResourceServer(resourceServer ->
                        resourceServer.authenticationEntryPoint(unauthenticated).jwt(Customizer.withDefaults()))
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(unauthenticated))
                .build();
    }

    @Bean
    JwtEncoder jwtEncoder(JwtProperties properties) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key(properties)));
    }

    /** Checks the signature, the issuer and the expiry, against the application's clock and with no leeway. */
    @Bean
    JwtDecoder jwtDecoder(JwtProperties properties, Clock clock) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key(properties))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        JwtTimestampValidator expiry = new JwtTimestampValidator(Duration.ZERO);
        expiry.setClock(clock);
        decoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(expiry, new JwtIssuerValidator(JwtAccessTokens.ISSUER)));
        return decoder;
    }

    private static SecretKey key(JwtProperties properties) {
        return new SecretKeySpec(properties.keyBytes(), "HmacSHA256");
    }
}
