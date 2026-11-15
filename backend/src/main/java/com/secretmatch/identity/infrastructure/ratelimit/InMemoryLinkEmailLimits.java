package com.secretmatch.identity.infrastructure.ratelimit;

import com.secretmatch.identity.application.LinkEmailLimits;
import com.secretmatch.identity.domain.EmailAddress;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * {@link LinkEmailLimits} kept in memory (ADR 0006): the app runs as one instance, and a restart forgetting
 * the counts is acceptable. Neither emails nor counts are ever logged.
 */
class InMemoryLinkEmailLimits implements LinkEmailLimits {

    private static final Logger log = LoggerFactory.getLogger(InMemoryLinkEmailLimits.class);

    private final Map<LinkRequest, KeyedBuckets> perEmail = new EnumMap<>(LinkRequest.class);
    private final int dailyCap;
    private final Clock clock;

    private LocalDate day;
    private int sentToday;

    InMemoryLinkEmailLimits(Limit signUp, Limit newVerificationLink, Limit resetLink, int dailyCap, Clock clock) {
        perEmail.put(LinkRequest.SIGN_UP, new KeyedBuckets(signUp, clock));
        perEmail.put(LinkRequest.NEW_VERIFICATION_LINK, new KeyedBuckets(newVerificationLink, clock));
        perEmail.put(LinkRequest.RESET_LINK, new KeyedBuckets(resetLink, clock));
        this.dailyCap = dailyCap;
        this.clock = clock;
    }

    @Override
    public boolean allowsRequest(LinkRequest request, EmailAddress email) {
        return perEmail.get(request).tryTake(email.value()).isEmpty();
    }

    @Override
    public synchronized boolean allowsSending() {
        LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
        if (!today.equals(day)) {
            day = today;
            sentToday = 0;
        }
        if (sentToday < dailyCap) {
            sentToday++;
            return true;
        }
        if (sentToday == dailyCap) {
            // Counted past the cap once, so the warning is logged once a day.
            sentToday++;
            log.warn("Daily cap of Verification and Password Reset emails reached: no more are sent until 00:00 UTC");
        }
        return false;
    }
}
