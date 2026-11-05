package com.secretmatch.shared.infrastructure.web;

import com.secretmatch.shared.domain.DomainException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Answers with an RFC 9457 problem for Spring MVC's own exceptions (unknown route, bad request, unsupported
 * method…) through {@link ResponseEntityExceptionHandler}, and for domain exceptions as 422 with a stable
 * {@code type} per error kind. Other unexpected exceptions still reach Spring Boot's default error handling.
 */
@RestControllerAdvice
class ProblemDetailAdvice extends ResponseEntityExceptionHandler {

    private static final String PROBLEM_TYPE_PREFIX = "urn:secretmatch:problem:";

    @ExceptionHandler
    ProblemDetail handle(DomainException exception) {
        ProblemDetail problem =
                ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, exception.getMessage());
        problem.setType(URI.create(PROBLEM_TYPE_PREFIX + exception.code()));
        return problem;
    }
}
