package com.secretmatch.draw.domain;

import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;

/**
 * Draws a Group: Members, Exclusions and a random source in, a complete set of Assignments (or "no valid Draw") out.
 * Pure domain logic, no I/O (docs/architecture.md §2.3, ADR 0001).
 */
public final class DrawEngine {

    private static final int MINIMUM_MEMBERS = 4;

    private DrawEngine() {}

    public static DrawResult draw(Set<MemberId> members, Set<Exclusion> exclusions, RandomGenerator random) {
        if (members.size() < MINIMUM_MEMBERS) {
            throw new NotEnoughMembersException();
        }
        List<MemberId> ordered =
                members.stream().sorted(Comparator.comparing(MemberId::value)).toList();
        int size = ordered.size();
        boolean[][] allowed = new boolean[size][size];
        for (int giver = 0; giver < size; giver++) {
            for (int receiver = 0; receiver < size; receiver++) {
                allowed[giver][receiver] = giver != receiver && !excluded(exclusions, ordered, giver, receiver);
            }
        }
        return new Search(allowed, random)
                .run()
                .<DrawResult>map(receiverOf -> new DrawResult.Drawn(assignments(ordered, receiverOf)))
                .orElseGet(DrawResult.NoValidDraw::new);
    }

    private static Set<Assignment> assignments(List<MemberId> ordered, int[] receiverOf) {
        Set<Assignment> assignments = new HashSet<>();
        for (int giver = 0; giver < receiverOf.length; giver++) {
            assignments.add(new Assignment(ordered.get(giver), ordered.get(receiverOf[giver])));
        }
        return assignments;
    }

    private static boolean excluded(Set<Exclusion> exclusions, List<MemberId> ordered, int giver, int receiver) {
        return exclusions.stream()
                .anyMatch(exclusion -> exclusion.separates(ordered.get(giver), ordered.get(receiver)));
    }

    /**
     * Randomised backtracking over Members by index; {@code allowed[g][r]} says whether g may give to r.
     *
     * <p>Two prunings keep it fast for ~50 Members: the next Giver is always the one with the fewest candidates left,
     * and a branch is abandoned as soon as the remaining Givers can no longer all be matched to a free Receiver.
     */
    private static final class Search {

        private static final int NONE = -1;

        private final boolean[][] allowed;
        private final RandomGenerator random;
        private final int size;
        private final int[] receiverOf;
        private final int[] giverOf;

        Search(boolean[][] allowed, RandomGenerator random) {
            this.allowed = allowed;
            this.random = random;
            this.size = allowed.length;
            this.receiverOf = filled(size);
            this.giverOf = filled(size);
        }

        /** The Receiver of each Giver, or empty when no valid Draw exists. */
        Optional<int[]> run() {
            return assignRemaining(size) ? Optional.of(receiverOf.clone()) : Optional.empty();
        }

        private boolean assignRemaining(int remaining) {
            if (remaining == 0) {
                return true;
            }
            if (!remainingGiversCanAllBeMatched()) {
                return false;
            }
            int giver = mostConstrainedGiver();
            for (int receiver : shuffled(candidatesOf(giver))) {
                receiverOf[giver] = receiver;
                giverOf[receiver] = giver;
                if (assignRemaining(remaining - 1)) {
                    return true;
                }
                receiverOf[giver] = NONE;
                giverOf[receiver] = NONE;
            }
            return false;
        }

        /** The unassigned Giver with the fewest candidates; ties go to the lowest index. */
        private int mostConstrainedGiver() {
            int chosen = NONE;
            int fewest = Integer.MAX_VALUE;
            for (int giver = 0; giver < size; giver++) {
                if (receiverOf[giver] == NONE) {
                    int count = candidatesOf(giver).length;
                    if (count < fewest) {
                        chosen = giver;
                        fewest = count;
                    }
                }
            }
            return chosen;
        }

        /** Whether every unassigned Giver can get a distinct free Receiver at once (Kuhn's bipartite matching). */
        private boolean remainingGiversCanAllBeMatched() {
            int[] tentativeGiverOf = filled(size);
            for (int giver = 0; giver < size; giver++) {
                if (receiverOf[giver] == NONE && !augment(giver, tentativeGiverOf, new boolean[size])) {
                    return false;
                }
            }
            return true;
        }

        private boolean augment(int giver, int[] tentativeGiverOf, boolean[] visited) {
            for (int receiver = 0; receiver < size; receiver++) {
                if (canGive(giver, receiver) && !visited[receiver]) {
                    visited[receiver] = true;
                    if (tentativeGiverOf[receiver] == NONE
                            || augment(tentativeGiverOf[receiver], tentativeGiverOf, visited)) {
                        tentativeGiverOf[receiver] = giver;
                        return true;
                    }
                }
            }
            return false;
        }

        private int[] candidatesOf(int giver) {
            int[] candidates = new int[size];
            int count = 0;
            for (int receiver = 0; receiver < size; receiver++) {
                if (canGive(giver, receiver)) {
                    candidates[count++] = receiver;
                }
            }
            return Arrays.copyOf(candidates, count);
        }

        /** Free Receiver, not forbidden, and not someone who already gives to this Giver (no reciprocal pair). */
        private boolean canGive(int giver, int receiver) {
            return allowed[giver][receiver] && giverOf[receiver] == NONE && receiverOf[receiver] != giver;
        }

        /** Fisher–Yates shuffle with the injected random source. */
        private int[] shuffled(int[] values) {
            for (int i = values.length - 1; i > 0; i--) {
                int j = random.nextInt(i + 1);
                int swap = values[i];
                values[i] = values[j];
                values[j] = swap;
            }
            return values;
        }

        private static int[] filled(int size) {
            int[] values = new int[size];
            Arrays.fill(values, NONE);
            return values;
        }
    }
}
