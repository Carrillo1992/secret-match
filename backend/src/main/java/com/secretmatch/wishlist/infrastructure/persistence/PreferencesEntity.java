package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.domain.Preferences;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;

/** The {@code preferences} table: a row only for a Member who wrote some. */
@Entity
@Table(name = "preferences")
class PreferencesEntity {

    @EmbeddedId
    private Key key;

    @Column(nullable = false)
    private String text;

    protected PreferencesEntity() {}

    PreferencesEntity(Key key, String text) {
        this.key = key;
        this.text = text;
    }

    void write(String text) {
        this.text = text;
    }

    Preferences toPreferences() {
        return new Preferences(text);
    }

    @Embeddable
    record Key(
            @Column(name = "group_id") UUID groupId,
            @Column(name = "owner_id") UUID ownerId) implements Serializable {}
}
