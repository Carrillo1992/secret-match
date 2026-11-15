package com.secretmatch.identity.infrastructure.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The address of the client behind a known number of proxies (ADR 0006). Each proxy appends the address it
 * received the request from to {@code X-Forwarded-For}, and none of them strips what the client sent. So
 * only the entry the outermost proxy appended is trusted: the {@code trustedProxies}-th from the right.
 * Anything to its left was written by the client.
 */
class ClientIps {

    private static final String FORWARDED_FOR = "X-Forwarded-For";

    private final int trustedProxies;

    ClientIps(int trustedProxies) {
        if (trustedProxies < 0) {
            throw new IllegalArgumentException("trusted proxies cannot be negative");
        }
        this.trustedProxies = trustedProxies;
    }

    String of(HttpServletRequest request) {
        if (trustedProxies == 0) {
            return request.getRemoteAddr();
        }
        List<String> entries = forwardedFor(request);
        if (entries.size() < trustedProxies) {
            return request.getRemoteAddr();
        }
        return entries.get(entries.size() - trustedProxies);
    }

    private static List<String> forwardedFor(HttpServletRequest request) {
        List<String> entries = new ArrayList<>();
        for (String header : Collections.list(request.getHeaders(FORWARDED_FOR))) {
            for (String entry : header.split(",")) {
                if (!entry.isBlank()) {
                    entries.add(entry.strip());
                }
            }
        }
        return entries;
    }
}
