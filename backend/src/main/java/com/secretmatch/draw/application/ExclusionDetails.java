package com.secretmatch.draw.application;

import java.util.List;
import java.util.UUID;

/** An Exclusion as the Admin sees it: its id and its two Members. */
public record ExclusionDetails(UUID id, List<Member> members) {

    public ExclusionDetails {
        members = List.copyOf(members);
    }

    /** {@code id} is the id of the User the Member is. */
    public record Member(UUID id, String displayName) {}
}
