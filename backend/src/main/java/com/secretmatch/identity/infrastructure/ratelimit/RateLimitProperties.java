package com.secretmatch.identity.infrastructure.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The limits of ADR 0006, under {@code secretmatch.rate-limit} (defaults in {@code application.yml}).
 *
 * @param trustedProxies how many proxies in front of the API append to {@code X-Forwarded-For}: 0 locally,
 *     where the remote address is the client
 * @param dailyEmailCap how many Verification and Password Reset emails go out per UTC day, in total
 * @param perEmail the silent limits per email
 * @param perIp the limits per client IP, answered with 429
 */
@ConfigurationProperties("secretmatch.rate-limit")
record RateLimitProperties(int trustedProxies, int dailyEmailCap, PerEmail perEmail, PerIp perIp) {

    record PerEmail(Limit signUp, Limit newVerificationLink, Limit resetLink) {}

    /**
     * @param linkEmail shared by asking for a reset link and for a new verification link
     * @param passwordReset setting a new password with a reset link's token
     */
    record PerIp(Limit signUp, Limit linkEmail, Limit signIn, Limit passwordReset) {}
}
