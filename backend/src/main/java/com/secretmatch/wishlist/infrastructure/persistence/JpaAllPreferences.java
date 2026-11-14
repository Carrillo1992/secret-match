package com.secretmatch.wishlist.infrastructure.persistence;

import com.secretmatch.wishlist.application.AllPreferences;
import com.secretmatch.wishlist.domain.MemberId;
import com.secretmatch.wishlist.domain.Preferences;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaAllPreferences implements AllPreferences {

    private final PreferencesRepository repository;

    JpaAllPreferences(PreferencesRepository repository) {
        this.repository = repository;
    }

    @Override
    public Preferences of(UUID groupId, MemberId owner) {
        return repository
                .findById(new PreferencesEntity.Key(groupId, owner.value()))
                .map(PreferencesEntity::toPreferences)
                .orElse(Preferences.NONE);
    }

    @Override
    public void save(UUID groupId, MemberId owner, Preferences preferences) {
        PreferencesEntity.Key key = new PreferencesEntity.Key(groupId, owner.value());
        if (preferences.text() == null) {
            removeAllOf(groupId, owner);
            return;
        }
        repository
                .findById(key)
                .ifPresentOrElse(
                        entity -> entity.write(preferences.text()),
                        () -> repository.save(new PreferencesEntity(key, preferences.text())));
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
