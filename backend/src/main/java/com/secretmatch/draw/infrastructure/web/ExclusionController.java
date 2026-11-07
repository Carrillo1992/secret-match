package com.secretmatch.draw.infrastructure.web;

import com.secretmatch.draw.application.GroupExclusions;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/exclusions")
@Tag(name = "exclusions")
class ExclusionController {

    private final GroupExclusions exclusions;

    ExclusionController(GroupExclusions exclusions) {
        this.exclusions = exclusions;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "The Group's Exclusions",
            description = "Only the Admin can see them, oldest first. Anyone else gets a 404.")
    List<ExclusionResponse> groupExclusions(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        return exclusions.exclusionsOf(groupId, signedIn(accessToken)).stream()
                .map(ExclusionResponse::of)
                .toList();
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Set an Exclusion between two Members of the Group",
            description = "Only the Admin can; anyone else gets a 404. If the two Members already have an Exclusion,"
                    + " in either order, nothing changes and that one comes back.")
    ExclusionResponse createExclusion(
            @AuthenticationPrincipal Jwt accessToken,
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateExclusionRequest request) {
        return ExclusionResponse.of(exclusions.exclude(
                groupId,
                signedIn(accessToken),
                request.memberIds().get(0),
                request.memberIds().get(1)));
    }

    @DeleteMapping("/{exclusionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete one of the Group's Exclusions", description = "Only the Admin can.")
    void deleteExclusion(
            @AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId, @PathVariable UUID exclusionId) {
        exclusions.remove(groupId, signedIn(accessToken), exclusionId);
    }

    private static UUID signedIn(Jwt accessToken) {
        return UUID.fromString(accessToken.getSubject());
    }
}
