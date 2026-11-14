package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.application.StoredDontListEntry;
import com.secretmatch.wishlist.domain.DontListEntry;
import com.secretmatch.wishlist.domain.MemberId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The {@code dont_list_entries} table. */
@Entity
@Table(name = "dont_list_entries")
class DontListEntryEntity {

    @Id
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String text;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected DontListEntryEntity() {}

    static DontListEntryEntity newEntry(UUID groupId, MemberId owner, DontListEntry entry, Instant createdAt) {
        DontListEntryEntity entity = new DontListEntryEntity();
        entity.id = UUID.randomUUID();
        entity.groupId = groupId;
        entity.ownerId = owner.value();
        entity.text = entry.text();
        entity.createdAt = createdAt;
        return entity;
    }

    StoredDontListEntry toStored() {
        return new StoredDontListEntry(id, new MemberId(ownerId), new DontListEntry(text));
    }
}
