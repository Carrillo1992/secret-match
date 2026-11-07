package com.secretmatch.group.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface GroupRepository extends JpaRepository<GroupEntity, UUID> {

    /** The Groups with this Member, each with all its Members, in one query. */
    @EntityGraph(attributePaths = "members")
    @Query("""
            SELECT g FROM GroupEntity g
            WHERE g.id IN (SELECT mg.id FROM GroupEntity mg JOIN mg.members m WHERE m.userId = :userId)
            ORDER BY g.exchangeDate, g.name, g.id
            """)
    List<GroupEntity> findWithMember(UUID userId);

    @EntityGraph(attributePaths = "members")
    Optional<GroupEntity> findByInviteCode(String inviteCode);

    /**
     * Inserts the Member row directly instead of saving the whole Group, so two Users joining at once do not
     * overwrite each other's row, and the same User joining twice at once adds one row.
     *
     * @return 1 if the Member was added, 0 if they were one already
     */
    @Modifying
    @Query(value = """
            INSERT INTO group_members (group_id, user_id, joined_at)
            VALUES (:groupId, :userId, :joinedAt)
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int addMember(UUID groupId, UUID userId, Instant joinedAt);

    @Modifying
    @Query("UPDATE GroupEntity g SET g.inviteCode = :inviteCode WHERE g.id = :groupId")
    int updateInviteCode(UUID groupId, String inviteCode);
}
