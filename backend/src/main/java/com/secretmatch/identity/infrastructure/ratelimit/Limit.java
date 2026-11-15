package com.secretmatch.identity.infrastructure.ratelimit;

import java.time.Duration;

/**
 * At most {@code capacity} requests per {@code period}; all of them come back once the period has passed.
 */
public record Limit(int capacity, Duration period) {

    public Limit {
        if (capacity < 1) {
            throw new IllegalArgumentException("a limit allows at least one request");
        }
        if (period == null || period.isNegative() || period.isZero()) {
            throw new IllegalArgumentException("a limit needs a positive period");
        }
    }
}
