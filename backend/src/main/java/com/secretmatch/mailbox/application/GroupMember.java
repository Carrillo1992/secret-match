package com.secretmatch.mailbox.application;

import com.secretmatch.mailbox.domain.MemberId;
import java.util.Objects;

/** A Member of a Group, as the Mailbox module reads them from the Groups module. */
public record GroupMember(MemberId id, String displayName) {

    public GroupMember {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(displayName, "displayName");
    }
}
