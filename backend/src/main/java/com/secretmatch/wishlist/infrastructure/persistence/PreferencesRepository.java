package com.secretmatch.wishlist.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface PreferencesRepository extends JpaRepository<PreferencesEntity, PreferencesEntity.Key> {

    @Modifying
    @Query(value = "DELETE FROM preferences WHERE group_id = :groupId AND owner_id = :ownerId", nativeQuery = true)
    int removeAllOf(UUID groupId, UUID ownerId);

    @Modifying
    @Query(value = "DELETE FROM preferences WHERE group_id = :groupId", nativeQuery = true)
    int removeAllIn(UUID groupId);
}
