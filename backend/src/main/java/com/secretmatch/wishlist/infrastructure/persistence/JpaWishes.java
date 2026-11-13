package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.application.StoredWish;
import com.secretmatch.wishlist.application.Wishes;
import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Wish;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaWishes implements Wishes {

    private final WishRepository repository;

    JpaWishes(WishRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<StoredWish> of(UUID groupId, MemberId owner) {
        return repository.findOf(groupId, owner.value()).stream()
                .map(WishEntity::toStored)
                .toList();
    }

    @Override
    public Optional<StoredWish> find(UUID groupId, UUID wishId) {
        return repository.findByGroupIdAndId(groupId, wishId).map(WishEntity::toStored);
    }

    @Override
    public StoredWish add(UUID groupId, MemberId owner, Wish wish, Instant createdAt) {
        return repository
                .save(WishEntity.newWish(groupId, owner, wish, createdAt))
                .toStored();
    }

    @Override
    public StoredWish replace(UUID groupId, StoredWish wish) {
        WishEntity entity = repository
                .findByGroupIdAndId(groupId, wish.id())
                .orElseThrow(() -> new IllegalStateException("replacing a Wish that is not there"));
        entity.write(wish.wish());
        return entity.toStored();
    }

    @Override
    public void remove(UUID groupId, UUID wishId) {
        repository.remove(groupId, wishId);
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
