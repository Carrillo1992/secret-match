package com.secretmatch.draw.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * No query here returns more than one Assignment (ADR 0001). The one lookup by Receiver, {@link #findGiver}, only
 * routes Mailbox Messages.
 */
interface DrawRepository extends JpaRepository<DrawEntity, UUID> {

    /**
     * Two Draws of the same Group at once: the second waits for the first to commit, then adds nothing.
     *
     * @return 1 if it was added, 0 if the Group had a Draw already
     */
    @Modifying
    @Query(value = """
            INSERT INTO draws (group_id, drawn_at) VALUES (:groupId, :drawnAt)
            ON CONFLICT (group_id) DO NOTHING
            """, nativeQuery = true)
    int addDraw(UUID groupId, Instant drawnAt);

    @Modifying
    @Query(value = """
            INSERT INTO assignments (group_id, giver_id, receiver_id) VALUES (:groupId, :giverId, :receiverId)
            """, nativeQuery = true)
    int addAssignment(UUID groupId, UUID giverId, UUID receiverId);

    @Query(
            value = "SELECT receiver_id FROM assignments WHERE group_id = :groupId AND giver_id = :giverId",
            nativeQuery = true)
    Optional<UUID> findReceiver(UUID groupId, UUID giverId);

    /** Only for routing Mailbox Messages; never shown to anyone. */
    @Query(
            value = "SELECT giver_id FROM assignments WHERE group_id = :groupId AND receiver_id = :receiverId",
            nativeQuery = true)
    Optional<UUID> findGiver(UUID groupId, UUID receiverId);

    @Modifying
    @Query(value = "DELETE FROM assignments WHERE group_id = :groupId", nativeQuery = true)
    int removeAssignmentsIn(UUID groupId);

    /** Deletes, without reading them, the Assignments where this User gives or receives. */
    @Modifying
    @Query(value = "DELETE FROM assignments WHERE giver_id = :userId OR receiver_id = :userId", nativeQuery = true)
    int removeAssignmentsOf(UUID userId);

    @Modifying
    @Query(value = "DELETE FROM draws WHERE group_id = :groupId", nativeQuery = true)
    int removeDrawIn(UUID groupId);
}
