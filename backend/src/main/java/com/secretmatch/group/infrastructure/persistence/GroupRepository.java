package com.secretmatch.group.infrastructure.persistence;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

    /**
     * Deletes the Member row directly, like {@link #addMember}, so two removals at once delete it once.
     *
     * @return 1 if the Member was removed, 0 if they were not one any more
     */
    @Modifying
    @Query(value = "DELETE FROM group_members WHERE group_id = :groupId AND user_id = :userId", nativeQuery = true)
    int removeMember(UUID groupId, UUID userId);

    /**
     * {@code FOR UPDATE}, not {@code FOR NO KEY UPDATE}: only this lock also holds back a new Member's row, whose
     * foreign key check takes a key-share lock on the Group.
     */
    @Query(value = "SELECT id FROM groups WHERE id = :groupId FOR UPDATE", nativeQuery = true)
    Optional<UUID> lock(UUID groupId);

    /**
     * Its Members go with it ({@code ON DELETE CASCADE}).
     *
     * @return 1 if the Group was deleted, 0 if there was none
     */
    @Modifying
    @Query(value = "DELETE FROM groups WHERE id = :groupId", nativeQuery = true)
    int deleteGroup(UUID groupId);

    @Modifying
    @Query("""
            UPDATE GroupEntity g SET g.name = :name, g.exchangeDate = :exchangeDate, g.budget = :budget
            WHERE g.id = :groupId
            """)
    int updateDetails(UUID groupId, String name, LocalDate exchangeDate, BigDecimal budget);

    @Modifying
    @Query("UPDATE GroupEntity g SET g.inviteCode = :inviteCode WHERE g.id = :groupId")
    int updateInviteCode(UUID groupId, String inviteCode);
}
