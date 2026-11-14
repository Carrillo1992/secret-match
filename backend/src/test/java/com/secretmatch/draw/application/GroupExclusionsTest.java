package com.secretmatch.draw.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.ExclusionNotFoundException;
import com.secretmatch.draw.domain.ExclusionsNotFoundException;
import com.secretmatch.draw.domain.GroupDrawnException;
import com.secretmatch.draw.domain.GroupFinishedException;
import com.secretmatch.draw.domain.InvalidExclusionException;
import com.secretmatch.draw.domain.MemberId;
import com.secretmatch.group.application.GroupDeleted;
import com.secretmatch.group.application.MembershipEnded;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GroupExclusionsTest {

    private static final UUID GROUP = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID OTHER_GROUP = UUID.fromString("00000000-0000-0000-0000-00000000000b");
    private static final UUID CARMEN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID LUIS = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID MARTA = UUID.fromString("00000000-0000-0000-0000-000000000003");
    private static final UUID STRANGER = UUID.fromString("00000000-0000-0000-0000-000000000009");

    private final InMemoryExclusions stored = new InMemoryExclusions();
    private final FakeRosters rosters = new FakeRosters();
    private final GroupExclusions exclusions =
            new GroupExclusions(stored, rosters, Clock.fixed(Instant.parse("2026-12-01T10:00:00Z"), ZoneOffset.UTC));

    {
        rosters.put(GROUP, roster(false));
        rosters.put(
                OTHER_GROUP, new Roster("Otro grupo", new MemberId(LUIS), List.of(member(LUIS, "Luis")), false, false));
    }

    @Test
    @DisplayName("an Exclusion set in either order is the same one: the second is a no-op that returns the first")
    void settingAnExclusionTwiceIsANoOp() {
        ExclusionDetails first = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        ExclusionDetails again = exclusions.exclude(GROUP, CARMEN, MARTA, LUIS);

        assertThat(again.id()).isEqualTo(first.id());
        assertThat(exclusions.exclusionsOf(GROUP, CARMEN))
                .singleElement()
                .satisfies(exclusion -> assertThat(exclusion.members())
                        .extracting(ExclusionDetails.Member::displayName)
                        .containsExactlyInAnyOrder("Luis", "Marta"));
    }

    @Test
    @DisplayName("the Admin can exclude themselves from someone else")
    void adminCanBeInAnExclusion() {
        exclusions.exclude(GROUP, CARMEN, CARMEN, LUIS);

        assertThat(exclusions.exclusionsOf(GROUP, CARMEN)).hasSize(1);
    }

    @Test
    @DisplayName("an Exclusion of a Member with themselves is rejected")
    void rejectsAMemberWithThemselves() {
        assertThatThrownBy(() -> exclusions.exclude(GROUP, CARMEN, LUIS, LUIS))
                .isInstanceOf(InvalidExclusionException.class)
                .hasFieldOrPropertyWithValue("code", "exclusion-same-member");
        assertThat(stored.all()).isEmpty();
    }

    @Test
    @DisplayName("an Exclusion with someone outside the Group is rejected")
    void rejectsSomeoneOutsideTheGroup() {
        assertThatThrownBy(() -> exclusions.exclude(GROUP, CARMEN, LUIS, STRANGER))
                .isInstanceOf(InvalidExclusionException.class)
                .hasFieldOrPropertyWithValue("code", "exclusion-not-a-member");
        assertThat(stored.all()).isEmpty();
    }

    @Test
    @DisplayName("a regular Member, a stranger and a missing Group all get the same not-found, for every use case")
    void onlyTheAdminSeesExclusions() {
        ExclusionDetails exclusion = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);

        for (UUID notAdmin : List.of(LUIS, STRANGER)) {
            assertThatThrownBy(() -> exclusions.exclusionsOf(GROUP, notAdmin))
                    .isInstanceOf(ExclusionsNotFoundException.class);
            assertThatThrownBy(() -> exclusions.exclude(GROUP, notAdmin, LUIS, CARMEN))
                    .isInstanceOf(ExclusionsNotFoundException.class);
            assertThatThrownBy(() -> exclusions.remove(GROUP, notAdmin, exclusion.id()))
                    .isInstanceOf(ExclusionsNotFoundException.class);
        }
        assertThatThrownBy(() -> exclusions.exclusionsOf(UUID.randomUUID(), CARMEN))
                .isInstanceOf(ExclusionsNotFoundException.class);
        assertThat(stored.all()).hasSize(1);
    }

    @Test
    @DisplayName("the Admin deletes an Exclusion; deleting it again, or one of another Group, is not found")
    void adminDeletesAnExclusion() {
        ExclusionDetails exclusion = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        exclusions.remove(GROUP, CARMEN, exclusion.id());

        assertThat(exclusions.exclusionsOf(GROUP, CARMEN)).isEmpty();
        assertThatThrownBy(() -> exclusions.remove(GROUP, CARMEN, exclusion.id()))
                .isInstanceOf(ExclusionNotFoundException.class);

        ExclusionDetails kept = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        assertThatThrownBy(() -> exclusions.remove(OTHER_GROUP, LUIS, kept.id()))
                .isInstanceOf(ExclusionNotFoundException.class);
        assertThat(exclusions.exclusionsOf(GROUP, CARMEN)).hasSize(1);
    }

    @Test
    @DisplayName("in a finished Group the Admin still lists the Exclusions but cannot change them")
    void finishedGroupIsReadOnly() {
        ExclusionDetails exclusion = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        rosters.put(GROUP, roster(true));

        assertThat(exclusions.exclusionsOf(GROUP, CARMEN)).hasSize(1);
        assertThatThrownBy(() -> exclusions.exclude(GROUP, CARMEN, CARMEN, LUIS))
                .isInstanceOf(GroupFinishedException.class);
        assertThatThrownBy(() -> exclusions.remove(GROUP, CARMEN, exclusion.id()))
                .isInstanceOf(GroupFinishedException.class);
        assertThat(stored.all()).hasSize(1);
    }

    @Test
    @DisplayName("in a drawn Group the Admin still lists the Exclusions but cannot change them")
    void drawnGroupIsFrozen() {
        ExclusionDetails exclusion = exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        rosters.put(GROUP, drawnRoster());

        assertThat(exclusions.exclusionsOf(GROUP, CARMEN)).hasSize(1);
        assertThatThrownBy(() -> exclusions.exclude(GROUP, CARMEN, CARMEN, LUIS))
                .isInstanceOf(GroupDrawnException.class)
                .hasFieldOrPropertyWithValue("code", "group-drawn");
        assertThatThrownBy(() -> exclusions.remove(GROUP, CARMEN, exclusion.id()))
                .isInstanceOf(GroupDrawnException.class);
        assertThat(stored.all()).hasSize(1);
    }

    @Test
    @DisplayName("when a membership ends, that Member's Exclusions in that Group go and the rest stay")
    void membershipEndedDeletesTheMembersExclusions() {
        exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        exclusions.exclude(GROUP, CARMEN, CARMEN, LUIS);
        exclusions.exclude(GROUP, CARMEN, CARMEN, MARTA);
        stored.add(OTHER_GROUP, new Exclusion(new MemberId(LUIS), new MemberId(STRANGER)), Instant.EPOCH);

        exclusions.on(new MembershipEnded(GROUP, LUIS));

        assertThat(exclusions.exclusionsOf(GROUP, CARMEN))
                .singleElement()
                .satisfies(exclusion -> assertThat(exclusion.members())
                        .extracting(ExclusionDetails.Member::displayName)
                        .containsExactlyInAnyOrder("Abuela Carmen", "Marta"));
        assertThat(stored.inGroup(OTHER_GROUP)).hasSize(1);
    }

    @Test
    @DisplayName("when a Group is deleted, all its Exclusions go and other Groups keep theirs")
    void groupDeletedDeletesItsExclusions() {
        exclusions.exclude(GROUP, CARMEN, LUIS, MARTA);
        exclusions.exclude(GROUP, CARMEN, CARMEN, LUIS);
        stored.add(OTHER_GROUP, new Exclusion(new MemberId(LUIS), new MemberId(STRANGER)), Instant.EPOCH);

        exclusions.on(new GroupDeleted(GROUP));

        assertThat(stored.inGroup(GROUP)).isEmpty();
        assertThat(stored.inGroup(OTHER_GROUP)).hasSize(1);
    }

    private static Roster roster(boolean finished) {
        return new Roster(
                "Navidad",
                new MemberId(CARMEN),
                List.of(member(CARMEN, "Abuela Carmen"), member(LUIS, "Luis"), member(MARTA, "Marta")),
                finished,
                false);
    }

    private static Roster drawnRoster() {
        return new Roster(
                "Navidad",
                new MemberId(CARMEN),
                List.of(member(CARMEN, "Abuela Carmen"), member(LUIS, "Luis"), member(MARTA, "Marta")),
                false,
                true);
    }

    private static Roster.Member member(UUID id, String displayName) {
        return new Roster.Member(new MemberId(id), displayName);
    }

    /** The Groups module as the Draw module sees it: only Members of a Group get its Roster. */
    private static final class FakeRosters implements Rosters {

        private final Map<UUID, Roster> byGroup = new HashMap<>();

        void put(UUID groupId, Roster roster) {
            byGroup.put(groupId, roster);
        }

        @Override
        public Optional<Roster> of(UUID groupId, UUID viewer) {
            return Optional.ofNullable(byGroup.get(groupId))
                    .filter(roster -> roster.member(new MemberId(viewer)).isPresent());
        }

        @Override
        public List<UUID> unfinishedGroupsOf(UUID member) {
            return byGroup.entrySet().stream()
                    .filter(entry -> !entry.getValue().finished()
                            && entry.getValue().member(new MemberId(member)).isPresent())
                    .map(Map.Entry::getKey)
                    .toList();
        }

        @Override
        public Optional<Roster> lockedOf(UUID groupId, UUID viewer) {
            return of(groupId, viewer);
        }

        @Override
        public void markDrawn(UUID groupId) {
            Roster roster = byGroup.get(groupId);
            byGroup.put(
                    groupId, new Roster(roster.groupName(), roster.admin(), roster.members(), roster.finished(), true));
        }
    }

    private static final class InMemoryExclusions implements Exclusions {

        private record Row(UUID groupId, StoredExclusion stored) {}

        private final List<Row> rows = new ArrayList<>();

        List<StoredExclusion> all() {
            return rows.stream().map(Row::stored).toList();
        }

        @Override
        public List<StoredExclusion> inGroup(UUID groupId) {
            return rows.stream()
                    .filter(row -> row.groupId().equals(groupId))
                    .map(Row::stored)
                    .toList();
        }

        @Override
        public StoredExclusion add(UUID groupId, Exclusion exclusion, Instant createdAt) {
            return inGroup(groupId).stream()
                    .filter(stored -> stored.exclusion().equals(exclusion))
                    .findFirst()
                    .orElseGet(() -> {
                        StoredExclusion stored = new StoredExclusion(UUID.randomUUID(), exclusion);
                        rows.add(new Row(groupId, stored));
                        return stored;
                    });
        }

        @Override
        public boolean remove(UUID groupId, UUID exclusionId) {
            return rows.removeIf(
                    row -> row.groupId().equals(groupId) && row.stored().id().equals(exclusionId));
        }

        @Override
        public void removeAllOf(UUID groupId, MemberId member) {
            rows.removeIf(row -> row.groupId().equals(groupId)
                    && (row.stored().exclusion().first().equals(member)
                            || row.stored().exclusion().second().equals(member)));
        }

        @Override
        public void removeAllIn(UUID groupId) {
            rows.removeIf(row -> row.groupId().equals(groupId));
        }
    }
}
