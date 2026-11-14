package com.secretmatch.draw.application;

import com.secretmatch.draw.domain.MemberId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * A Group's name, Admin and Members, as the Draw module needs them.
 *
 * @param groupName the Group's name, for the emails the Draw module sends
 * @param finished whether the Group's Exchange Date is over, which makes it read-only
 * @param drawn whether the Group's Draw is made, which freezes its Members and Exclusions
 */
public record Roster(String groupName, MemberId admin, List<Member> members, boolean finished, boolean drawn) {

    public Roster {
        Objects.requireNonNull(groupName, "groupName");
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
