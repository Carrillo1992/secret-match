package com.secretmatch.identity.infrastructure.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Lets each client IP make a limited number of POSTs to the paths it is registered for. It runs before the
 * body is read, so a request over the limit costs nothing and gets the same answer whatever it carried.
 */
class ClientIpThrottle implements HandlerInterceptor {

    private final KeyedBuckets buckets;
    private final ClientIps clientIps;

    ClientIpThrottle(KeyedBuckets buckets, ClientIps clientIps) {
        this.buckets = buckets;
        this.clientIps = clientIps;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (HttpMethod.POST.matches(request.getMethod())) {
            buckets.tryTake(clientIps.of(request)).ifPresent(wait -> {
                throw new TooManyRequestsException(wait);
            });
        }
        return true;
    }
}
