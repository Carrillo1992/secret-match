package com.secretmatch.identity.infrastructure.ratelimit;

import com.secretmatch.identity.application.LinkEmailLimits;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.handler.MappedInterceptor;

/** Rate limiting of the signed-out identity endpoints (ADR 0006). */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RateLimitProperties.class)
class RateLimitConfiguration {

    private static final String SIGN_UP = "/api/v1/sign-ups";
    private static final List<String> LINK_EMAILS = List.of(
            "/api/v1/password-reset-emails", "/api/v1/sign-ups/*/verification-emails", "/api/v1/verification-emails");
    private static final String SIGN_IN = "/api/v1/sessions";
    private static final String PASSWORD_RESET = "/api/v1/password-resets";

    private final RateLimitProperties properties;
    private final Clock clock;

    RateLimitConfiguration(RateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    @Bean
    LinkEmailLimits linkEmailLimits() {
        RateLimitProperties.PerEmail perEmail = properties.perEmail();
        return new InMemoryLinkEmailLimits(
                perEmail.signUp(),
                perEmail.newVerificationLink(),
                perEmail.resetLink(),
                properties.dailyEmailCap(),
                clock);
    }

    // MappedInterceptor beans, not a WebMvcConfigurer: Spring MVC picks them up, and web slice tests
    // (@WebMvcTest), which load every WebMvcConfigurer, do not need the clock and the limits.
    @Bean
    MappedInterceptor signUpThrottle() {
        return throttle(properties.perIp().signUp(), SIGN_UP);
    }

    @Bean
    MappedInterceptor linkEmailThrottle() {
        return throttle(properties.perIp().linkEmail(), LINK_EMAILS.toArray(String[]::new));
    }

    @Bean
    MappedInterceptor signInThrottle() {
        return throttle(properties.perIp().signIn(), SIGN_IN);
    }

    @Bean
    MappedInterceptor passwordResetThrottle() {
        return throttle(properties.perIp().passwordReset(), PASSWORD_RESET);
    }

    @Bean
    OpenApiCustomizer tooManyRequestsResponses() {
        List<String> throttled = new ArrayList<>(LINK_EMAILS);
        throttled.addAll(List.of(SIGN_UP, SIGN_IN, PASSWORD_RESET));
        return new TooManyRequestsOpenApiCustomizer(throttled);
    }

    private MappedInterceptor throttle(Limit limit, String... paths) {
        ClientIps clientIps = new ClientIps(properties.trustedProxies());
        return new MappedInterceptor(paths, new ClientIpThrottle(new KeyedBuckets(limit, clock), clientIps));
    }
}
