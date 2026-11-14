package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.application.DontListEntries;
import com.secretmatch.wishlist.application.StoredDontListEntry;
import com.secretmatch.wishlist.domain.DontListEntry;
import com.secretmatch.wishlist.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaDontListEntries implements DontListEntries {

    private final DontListEntryRepository repository;

    JpaDontListEntries(DontListEntryRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<StoredDontListEntry> of(UUID groupId, MemberId owner) {
        return repository.findOf(groupId, owner.value()).stream()
                .map(DontListEntryEntity::toStored)
                .toList();
    }

    @Override
    public Optional<StoredDontListEntry> find(UUID groupId, UUID entryId) {
        return repository.findByGroupIdAndId(groupId, entryId).map(DontListEntryEntity::toStored);
    }

    @Override
    public StoredDontListEntry add(UUID groupId, MemberId owner, DontListEntry entry, Instant createdAt) {
        return repository
                .save(DontListEntryEntity.newEntry(groupId, owner, entry, createdAt))
                .toStored();
    }

    @Override
    public void remove(UUID groupId, UUID entryId) {
        repository.remove(groupId, entryId);
    }

    @Override
    public void removeAllOf(UUID groupId, MemberId owner) {
        repository.removeAllOf(groupId, owner.value());
    }

    @Override
    public void removeAllIn(UUID groupId) {
        repository.removeAllIn(groupId);
    }
}
