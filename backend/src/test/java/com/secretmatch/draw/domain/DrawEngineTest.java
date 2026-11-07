package com.secretmatch.draw.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

class DrawEngineTest {

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 3})
    @DisplayName("refuses a Draw with fewer than 4 Members")
    void refusesFewerThanFourMembers(int size) {
        Set<MemberId> members = members(size);

        assertThatThrownBy(() -> DrawEngine.draw(members, Set.of(), new Random(1)))
                .isInstanceOf(NotEnoughMembersException.class)
                .hasMessage("A Draw needs at least 4 Members.");
    }

    @Test
    @DisplayName(
            "draws 4 Members with no Exclusions: everyone gives once and receives once, never themselves or reciprocally")
    void drawsFourMembers() {
        Set<MemberId> members = members(4);

        DrawResult result = DrawEngine.draw(members, Set.of(), new Random(1));

        assertThat(result).isInstanceOf(DrawResult.Drawn.class);
        assertHardRules(members, Set.of(), ((DrawResult.Drawn) result).assignments());
    }

    @Test
    @DisplayName("a Draw and its Assignments print without revealing who gives to whom")
    void printsWithoutRevealingAssignments() {
        DrawResult.Drawn drawn = (DrawResult.Drawn) DrawEngine.draw(members(4), Set.of(), new Random(1));

        assertThat(drawn.toString()).isEqualTo("Drawn[redacted]");
        assertThat(drawn.assignments())
                .allSatisfy(assignment -> assertThat(assignment.toString()).isEqualTo("Assignment[redacted]"));
    }

    @Test
    @DisplayName("reports no valid Draw when 4 Members are all excluded from each other")
    void noValidDrawWhenEveryoneIsExcluded() {
        Set<Exclusion> everyPair = Set.of(
                exclusion(1, 2), exclusion(1, 3), exclusion(1, 4), exclusion(2, 3), exclusion(2, 4), exclusion(3, 4));

        DrawResult result = DrawEngine.draw(members(4), everyPair, new Random(1));

        assertThat(result).isEqualTo(new DrawResult.NoValidDraw());
    }

    @Test
    @DisplayName("reports no valid Draw when only a reciprocal pair would satisfy the Exclusions")
    void noValidDrawWhenOnlyAReciprocalPairFits() {
        // Member 1 may only give to and receive from Member 2, which would force 1→2 and 2→1.
        Set<Exclusion> isolateOneWithTwo = Set.of(exclusion(1, 3), exclusion(1, 4));

        DrawResult result = DrawEngine.draw(members(4), isolateOneWithTwo, new Random(1));

        assertThat(result).isEqualTo(new DrawResult.NoValidDraw());
    }

    @ParameterizedTest(name = "seed {0}")
    @MethodSource("seeds")
    @DisplayName("in small Groups, finds a Draw exactly when brute force finds one, and it keeps every hard rule")
    void agreesWithBruteForceInSmallGroups(long seed) {
        Random shape = new Random(seed);
        Set<MemberId> members = members(4 + shape.nextInt(4));
        Set<Exclusion> exclusions = randomExclusions(members, shape.nextDouble() * 0.6, shape);

        DrawResult result = DrawEngine.draw(members, exclusions, new Random(seed));

        if (validDrawExists(members, exclusions)) {
            assertThat(result).isInstanceOf(DrawResult.Drawn.class);
            assertHardRules(members, exclusions, ((DrawResult.Drawn) result).assignments());
        } else {
            assertThat(result).isEqualTo(new DrawResult.NoValidDraw());
        }
    }

    @Test
    @DisplayName("the same seed and inputs always give the same Draw, whatever order the Members come in")
    void sameSeedSameDraw() {
        List<MemberId> members = List.copyOf(members(12));
        Set<Exclusion> exclusions = Set.of(exclusion(1, 5), exclusion(2, 7), exclusion(3, 9));
        Set<MemberId> reversed = new LinkedHashSet<>(members.reversed());

        DrawResult first = DrawEngine.draw(new LinkedHashSet<>(members), exclusions, new Random(42));
        DrawResult second = DrawEngine.draw(reversed, exclusions, new Random(42));

        assertThat(((DrawResult.Drawn) second).assignments()).isEqualTo(((DrawResult.Drawn) first).assignments());
    }

    @Test
    @DisplayName("different seeds give different Draws")
    void differentSeedsDifferentDraws() {
        Set<MemberId> members = members(12);

        Set<Set<Assignment>> draws = LongStream.range(0, 20)
                .mapToObj(
                        seed -> ((DrawResult.Drawn) DrawEngine.draw(members, Set.of(), new Random(seed))).assignments())
                .collect(Collectors.toSet());

        assertThat(draws).hasSizeGreaterThan(1);
    }

    @Test
    @DisplayName("quickly reports no valid Draw for 50 Members when only a reciprocal pair would fit one of them")
    void quicklyReportsImpossibleLargeGroup() {
        Set<MemberId> members = members(50);
        Set<Exclusion> isolateOneWithTwo = IntStream.rangeClosed(3, 50)
                .mapToObj(other -> exclusion(1, other))
                .collect(Collectors.toSet());

        DrawResult result = assertTimeoutPreemptively(
                Duration.ofSeconds(1), () -> DrawEngine.draw(members, isolateOneWithTwo, new Random(1)));

        assertThat(result).isEqualTo(new DrawResult.NoValidDraw());
    }

    @ParameterizedTest(name = "seed {0}")
    @MethodSource("seeds")
    @Timeout(value = 1, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    @DisplayName("in Groups of up to 50, quickly finds a Draw whenever one exists, and it keeps every hard rule")
    void drawsLargerGroupsThatHaveAValidDraw(long seed) {
        Random shape = new Random(seed);
        List<MemberId> members = List.copyOf(members(4 + shape.nextInt(47)));
        // Plant a valid Draw (a single cycle through a shuffled order), then exclude only pairs outside it.
        List<MemberId> cycle = new ArrayList<>(members);
        Collections.shuffle(cycle, shape);
        Set<Set<MemberId>> planted = new HashSet<>();
        for (int i = 0; i < cycle.size(); i++) {
            planted.add(Set.of(cycle.get(i), cycle.get((i + 1) % cycle.size())));
        }
        Set<Exclusion> exclusions = randomExclusions(Set.copyOf(members), shape.nextDouble() * 0.8, shape).stream()
                .filter(exclusion -> !planted.contains(Set.of(exclusion.first(), exclusion.second())))
                .collect(Collectors.toSet());

        DrawResult result = DrawEngine.draw(Set.copyOf(members), exclusions, new Random(seed));

        assertThat(result).isInstanceOf(DrawResult.Drawn.class);
        assertHardRules(Set.copyOf(members), exclusions, ((DrawResult.Drawn) result).assignments());
    }

    static LongStream seeds() {
        return LongStream.range(0, 500);
    }

    private static Set<Exclusion> randomExclusions(Set<MemberId> members, double density, Random random) {
        List<MemberId> list =
                members.stream().sorted(Comparator.comparing(MemberId::value)).toList();
        Set<Exclusion> exclusions = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            for (int j = i + 1; j < list.size(); j++) {
                if (random.nextDouble() < density) {
                    exclusions.add(new Exclusion(list.get(i), list.get(j)));
                }
            }
        }
        return exclusions;
    }

    /** Tries every permutation: the independent oracle for "a valid Draw exists". */
    private static boolean validDrawExists(Set<MemberId> members, Set<Exclusion> exclusions) {
        List<MemberId> givers = List.copyOf(members);
        return anyValidCompletion(givers, exclusions, new MemberId[givers.size()], new HashSet<>(), 0);
    }

    private static boolean anyValidCompletion(
            List<MemberId> givers, Set<Exclusion> exclusions, MemberId[] receivers, Set<MemberId> taken, int index) {
        if (index == givers.size()) {
            for (int i = 0; i < givers.size(); i++) {
                MemberId giver = givers.get(i);
                MemberId receiver = receivers[i];
                boolean reciprocal = receivers[givers.indexOf(receiver)].equals(giver);
                boolean excluded = exclusions.contains(new Exclusion(giver, receiver));
                if (reciprocal || excluded) {
                    return false;
                }
            }
            return true;
        }
        for (MemberId receiver : givers) {
            if (!receiver.equals(givers.get(index)) && taken.add(receiver)) {
                receivers[index] = receiver;
                if (anyValidCompletion(givers, exclusions, receivers, taken, index + 1)) {
                    return true;
                }
                taken.remove(receiver);
            }
        }
        return false;
    }

    /** Checks every hard rule of the Draw straight from the spec, independently of how the engine works. */
    private static void assertHardRules(Set<MemberId> members, Set<Exclusion> exclusions, Set<Assignment> assignments) {
        List<MemberId> givers = assignments.stream().map(Assignment::giver).toList();
        List<MemberId> receivers =
                assignments.stream().map(Assignment::receiver).toList();
        assertThat(givers).as("every Member gives exactly once").containsExactlyInAnyOrderElementsOf(members);
        assertThat(receivers).as("every Member receives exactly once").containsExactlyInAnyOrderElementsOf(members);
        for (Assignment assignment : assignments) {
            assertThat(assignment.giver()).as("nobody gives to themselves").isNotEqualTo(assignment.receiver());
            assertThat(assignments)
                    .as("no reciprocal pair")
                    .noneMatch(other -> other.giver().equals(assignment.receiver())
                            && other.receiver().equals(assignment.giver()));
            assertThat(exclusions)
                    .as("no Exclusion is violated")
                    .noneMatch(exclusion -> Set.of(exclusion.first(), exclusion.second())
                            .equals(Set.of(assignment.giver(), assignment.receiver())));
        }
    }

    private static Set<MemberId> members(int size) {
        return IntStream.rangeClosed(1, size).mapToObj(DrawEngineTest::member).collect(Collectors.toSet());
    }

    private static Exclusion exclusion(int one, int other) {
        return new Exclusion(member(one), member(other));
    }

    private static MemberId member(int number) {
        return new MemberId(UUID.fromString("00000000-0000-0000-0000-%012d".formatted(number)));
    }
}
