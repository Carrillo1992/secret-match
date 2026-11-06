package com.secretmatch.group.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The code from the Invite Link. Kept out of the URL, so it does not end up in access logs. */
record JoinGroupRequest(@NotBlank @Size(max = 64) String inviteCode) {}
