package com.secretmatch.wishlist.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface WishRepository extends JpaRepository<WishEntity, UUID> {

    @Query("SELECT w FROM WishEntity w WHERE w.groupId = :groupId AND w.ownerId = :ownerId ORDER BY w.createdAt, w.id")
    List<WishEntity> findOf(UUID groupId, UUID ownerId);

    Optional<WishEntity> findByGroupIdAndId(UUID groupId, UUID id);

    @Modifying
    @Query(value = "DELETE FROM wishes WHERE group_id = :groupId AND id = :wishId", nativeQuery = true)
    int remove(UUID groupId, UUID wishId);

    @Modifying
    @Query(value = "DELETE FROM wishes WHERE group_id = :groupId AND owner_id = :ownerId", nativeQuery = true)
    int removeAllOf(UUID groupId, UUID ownerId);

    @Modifying
    @Query(value = "DELETE FROM wishes WHERE group_id = :groupId", nativeQuery = true)
    int removeAllIn(UUID groupId);
}
