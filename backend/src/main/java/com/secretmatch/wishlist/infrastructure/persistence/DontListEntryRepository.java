package com.secretmatch.wishlist.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface DontListEntryRepository extends JpaRepository<DontListEntryEntity, UUID> {

    @Query("SELECT e FROM DontListEntryEntity e WHERE e.groupId = :groupId AND e.ownerId = :ownerId"
            + " ORDER BY e.createdAt, e.id")
    List<DontListEntryEntity> findOf(UUID groupId, UUID ownerId);

    Optional<DontListEntryEntity> findByGroupIdAndId(UUID groupId, UUID id);

    @Modifying
    @Query(value = "DELETE FROM dont_list_entries WHERE group_id = :groupId AND id = :entryId", nativeQuery = true)
    int remove(UUID groupId, UUID entryId);

    @Modifying
    @Query(
            value = "DELETE FROM dont_list_entries WHERE group_id = :groupId AND owner_id = :ownerId",
            nativeQuery = true)
    int removeAllOf(UUID groupId, UUID ownerId);

    @Modifying
    @Query(value = "DELETE FROM dont_list_entries WHERE group_id = :groupId", nativeQuery = true)
    int removeAllIn(UUID groupId);
}
