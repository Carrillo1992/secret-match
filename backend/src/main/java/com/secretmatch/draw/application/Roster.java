package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.MemberId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * A Group's Admin and Members, as the Draw module needs them.
 *
 * @param finished whether the Group's Exchange Date is over, which makes it read-only
 */
public record Roster(MemberId admin, List<Member> members, boolean finished) {

    public Roster {
        Objects.requireNonNull(admin, "admin");
        members = List.copyOf(members);
    }

    public Optional<Member> member(MemberId id) {
        return members.stream().filter(member -> member.id().equals(id)).findFirst();
    }

    public record Member(MemberId id, String displayName) {

        public Member {
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(displayName, "displayName");
        }
    }
}
