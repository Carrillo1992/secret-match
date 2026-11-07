package com.secretmatch.draw.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ExclusionRepository extends JpaRepository<ExclusionEntity, UUID> {

    @Query("SELECT e FROM ExclusionEntity e WHERE e.groupId = :groupId ORDER BY e.createdAt, e.id")
    List<ExclusionEntity> findInGroup(UUID groupId);

    /**
     * Inserts the pair in PostgreSQL's own order of UUIDs, which is not Java's, so A–B and B–A are one row, and
     * the same Exclusion added twice at once is stored once.
     *
     * @return 1 if it was added, 0 if the Group had it already
     */
    @Modifying
    @Query(value = """
            INSERT INTO exclusions (id, group_id, member_a, member_b, created_at)
            VALUES (:id, :groupId, LEAST(:one, :other), GREATEST(:one, :other), :createdAt)
            ON CONFLICT (group_id, member_a, member_b) DO NOTHING
            """, nativeQuery = true)
    int add(UUID id, UUID groupId, UUID one, UUID other, Instant createdAt);

    @Query(value = """
            SELECT * FROM exclusions
            WHERE group_id = :groupId AND member_a = LEAST(:one, :other) AND member_b = GREATEST(:one, :other)
            """, nativeQuery = true)
    Optional<ExclusionEntity> findPair(UUID groupId, UUID one, UUID other);

    @Modifying
    @Query(value = "DELETE FROM exclusions WHERE group_id = :groupId AND id = :exclusionId", nativeQuery = true)
    int remove(UUID groupId, UUID exclusionId);

    @Modifying
    @Query(value = """
            DELETE FROM exclusions WHERE group_id = :groupId AND (member_a = :memberId OR member_b = :memberId)
            """, nativeQuery = true)
    int removeAllOf(UUID groupId, UUID memberId);

    @Modifying
    @Query(value = "DELETE FROM exclusions WHERE group_id = :groupId", nativeQuery = true)
    int removeAllIn(UUID groupId);
}
