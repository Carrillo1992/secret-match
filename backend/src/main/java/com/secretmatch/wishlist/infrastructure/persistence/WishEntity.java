package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.application.StoredWish;
import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Priority;
import com.secretmatch.wishlist.domain.Wish;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** The {@code wishes} table. */
@Entity
@Table(name = "wishes")
class WishEntity {

    @Id
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String title;

    private String link;

    @Column(precision = 8, scale = 2)
    private BigDecimal price;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WishEntity() {}

    static WishEntity newWish(UUID groupId, MemberId owner, Wish wish, Instant createdAt) {
        WishEntity entity = new WishEntity();
        entity.id = UUID.randomUUID();
        entity.groupId = groupId;
        entity.ownerId = owner.value();
        entity.createdAt = createdAt;
        entity.write(wish);
        return entity;
    }

    void write(Wish wish) {
        title = wish.title();
        link = wish.link();
        price = wish.price();
        notes = wish.notes();
        priority = wish.priority();
    }

    StoredWish toStored() {
        return new StoredWish(id, new MemberId(ownerId), new Wish(title, link, price, notes, priority));
    }
}
