package com.secretmatch.group.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
