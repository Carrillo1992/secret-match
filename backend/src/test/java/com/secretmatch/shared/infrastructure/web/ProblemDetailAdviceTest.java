package com.secretmatch.shared.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.shared.domain.DomainException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest
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

    @RestController
    static class RuleBreakingController {

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
}
