package com.secretmatch.identity.infrastructure.web;

import com.secretmatch.identity.domain.DisplayName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Mirrors the domain rule, so a mistake is a 400; surrounding spaces are trimmed by the domain. */
record DisplayNameRequest(
        @NotBlank @Size(max = DisplayName.MAX_LENGTH) String displayName) {}
