package com.secretmatch.group.infrastructure.web;

import com.secretmatch.group.application.CreateGroupCommand;
import com.secretmatch.group.application.GroupDetails;
import com.secretmatch.group.application.MyGroups;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.MemberId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/groups")
@Tag(name = "groups")
class GroupController {

    private final MyGroups myGroups;

    GroupController(MyGroups myGroups) {
        this.myGroups = myGroups;
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Create a Group", description = "The signed-in User becomes its Admin and first Member.")
    ResponseEntity<GroupResponse> create(
            @AuthenticationPrincipal Jwt accessToken, @Valid @RequestBody CreateGroupRequest request) {
        GroupDetails group = myGroups.create(
                signedIn(accessToken),
                new CreateGroupCommand(request.name(), request.exchangeDate(), request.budget()));
        return ResponseEntity.created(URI.create("/api/v1/groups/" + group.id()))
                .body(GroupResponse.of(group));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "The Groups the signed-in User is a Member of", description = "Soonest Exchange Date first.")
    List<GroupSummaryResponse> myGroups(@AuthenticationPrincipal Jwt accessToken) {
        return myGroups.groupsOf(signedIn(accessToken)).stream()
                .map(GroupSummaryResponse::of)
                .toList();
    }

    @GetMapping(value = "/{groupId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "A Group the signed-in User is a Member of")
    GroupResponse group(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        return GroupResponse.of(myGroups.group(new GroupId(groupId), signedIn(accessToken)));
    }

    @PostMapping(value = "/{groupId}/invite-link", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Regenerate the Group's Invite Link",
            description = "Only the Admin can. The previous Invite Link stops working.")
    GroupResponse regenerateInviteLink(@AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId) {
        return GroupResponse.of(myGroups.regenerateInviteLink(new GroupId(groupId), signedIn(accessToken)));
    }

    @DeleteMapping("/{groupId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Leave the Group, or remove a Member from it",
            description = "A Member leaves when memberId is their own id; only the Admin can remove someone else,"
                    + " and the Admin cannot leave. The removed Member is emailed.")
    void removeMember(
            @AuthenticationPrincipal Jwt accessToken, @PathVariable UUID groupId, @PathVariable UUID memberId) {
        myGroups.removeMember(new GroupId(groupId), signedIn(accessToken), new MemberId(memberId));
    }

    private static MemberId signedIn(Jwt accessToken) {
        return new MemberId(UUID.fromString(accessToken.getSubject()));
    }
}
