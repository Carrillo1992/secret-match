package com.secretmatch.identity.infrastructure.ratelimit;

import java.net.URI;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * A client IP over its limit. Answered as a 429 problem by the usual advice; its content never depends on
 * the request, so it says nothing about any email.
 */
final class TooManyRequestsException extends ErrorResponseException {

    TooManyRequestsException(Duration retryAfter) {
        super(HttpStatus.TOO_MANY_REQUESTS, problem(), null);
        // Rounded up, so a client that waits exactly this long gets in.
        long seconds = Math.max(1, (retryAfter.toMillis() + 999) / 1000);
        getHeaders().set(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
    }

    private static ProblemDetail problem() {
        ProblemDetail problem =
                ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again later.");
        problem.setType(URI.create("urn:secretmatch:problem:too-many-requests"));
        return problem;
    }
}
