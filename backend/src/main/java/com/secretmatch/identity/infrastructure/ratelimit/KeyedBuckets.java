package com.secretmatch.identity.infrastructure.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.TimeMeter;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * One in-memory Bucket4j bucket per key (an IP, an email), refilled whole once its period has passed. A
 * bucket unused for a whole period would be full again, so it is forgotten then: memory follows the keys
 * seen in the last period, not every key ever seen.
 */
final class KeyedBuckets {

    private final Limit limit;
    private final TimeMeter time;
    private final Cache<String, Bucket> buckets;

    KeyedBuckets(Limit limit, Clock clock) {
        this.limit = limit;
        this.time = new ClockTimeMeter(clock);
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(limit.period())
                .ticker(time::currentTimeNanos)
                .build();
    }

    /**
     * Takes one request from this key's bucket.
     *
     * @return empty if it was allowed, else how long until the bucket refills
     */
    Optional<Duration> tryTake(String key) {
        var probe = buckets.get(key, k -> newBucket()).tryConsumeAndReturnRemaining(1);
        return probe.isConsumed() ? Optional.empty() : Optional.of(Duration.ofNanos(probe.getNanosToWaitForRefill()));
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(bandwidth ->
                        bandwidth.capacity(limit.capacity()).refillIntervally(limit.capacity(), limit.period()))
                .withCustomTimePrecision(time)
                .build();
    }

    /** Bucket4j and Caffeine read the application's clock, so tests move time by hand. */
    private record ClockTimeMeter(Clock clock) implements TimeMeter {

        @Override
        public long currentTimeNanos() {
            Instant now = clock.instant();
            return now.getEpochSecond() * 1_000_000_000L + now.getNano();
        }

        @Override
        public boolean isWallClockBased() {
            return true;
        }
    }
}
