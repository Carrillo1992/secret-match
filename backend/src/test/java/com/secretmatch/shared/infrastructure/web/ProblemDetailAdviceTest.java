package com.secretmatch.shared.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.shared.domain.DomainException;
import com.secretmatch.shared.domain.NotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Only the test controller: the real ones need their use cases, which a web slice does not load.
@WebMvcTest(controllers = ProblemDetailAdviceTest.RuleBreakingController.class)
@ActiveProfiles("test")
@Import(ProblemDetailAdviceTest.RuleBreakingController.class)
class ProblemDetailAdviceTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("answers a broken business rule with a 422 problem that names the error kind")
    void answersDomainExceptionWithProblem() {
        MvcTestResult result = mvc.get().uri("/rule-breaker").exchange();

        assertThat(result).hasStatus(422).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("urn:secretmatch:problem:example-rule-broken");
        assertThat(result).bodyJson().extractingPath("$.status").isEqualTo(422);
        assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("The example rule was broken.");
        assertThat(result).bodyJson().doesNotHavePath("$.trace");
    }

    @Test
    @DisplayName("answers something the caller may not know about with a 404 problem")
    void answersNotFoundWith404() {
        MvcTestResult result = mvc.get().uri("/hidden").exchange();

        assertThat(result).hasStatus(404).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("urn:secretmatch:problem:example-not-found");
        assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("The example does not exist.");
    }

    @Test
    @DisplayName("answers an unexpected error with a 500 problem that hides the exception message")
    void answersUnexpectedErrorWithOpaqueProblem() throws Exception {
        MvcTestResult result = mvc.get().uri("/crash").exchange();

        assertThat(result).hasStatus(500).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.status").isEqualTo(500);
        assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("An unexpected error occurred.");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("internal secret");
    }

    @RestController
    static class RuleBreakingController {

        @GetMapping("/crash")
        String crash() {
            throw new IllegalStateException("internal secret");
        }

        @GetMapping("/hidden")
        String hidden() {
            throw new ExampleNotFound();
        }

        @GetMapping("/rule-breaker")
        String breakRule() {
            throw new ExampleRuleBroken();
        }
    }

    static class ExampleRuleBroken extends DomainException {

        ExampleRuleBroken() {
            super("example-rule-broken", "The example rule was broken.");
        }
    }

    static class ExampleNotFound extends NotFoundException {

        ExampleNotFound() {
            super("example-not-found", "The example does not exist.");
        }
    }
}
