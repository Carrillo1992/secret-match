package com.secretmatch.draw.infrastructure.persistence;

import com.secretmatch.draw.application.Exclusions;
import com.secretmatch.draw.application.StoredExclusion;
import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaExclusions implements Exclusions {

    private final ExclusionRepository repository;

    JpaExclusions(ExclusionRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<StoredExclusion> inGroup(UUID groupId) {
        return repository.findInGroup(groupId).stream()
                .map(ExclusionEntity::toStored)
                .toList();
    }

    @Override
    public StoredExclusion add(UUID groupId, Exclusion exclusion, Instant createdAt) {
        UUID one = exclusion.first().value();
        UUID other = exclusion.second().value();
        repository.add(UUID.randomUUID(), groupId, one, other, createdAt);
        return repository
                .findPair(groupId, one, other)
                .map(ExclusionEntity::toStored)
                .orElseThrow(() -> new IllegalStateException("an Exclusion just stored is not there"));
    }

    @Override
    public boolean remove(UUID groupId, UUID exclusionId) {
        return repository.remove(groupId, exclusionId) == 1;
    }

    @Override
    public void removeAllOf(UUID groupId, MemberId member) {
        repository.removeAllOf(groupId, member.value());
    }

    @Override
    public void removeAllIn(UUID groupId) {
        repository.removeAllIn(groupId);
    }
}
