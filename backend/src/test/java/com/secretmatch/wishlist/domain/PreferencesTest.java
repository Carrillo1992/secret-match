package com.secretmatch.wishlist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class PreferencesTest {

    @Test
    @DisplayName("Preferences keep their text, without surrounding spaces")
    void keepsTheText() {
        Preferences preferences = new Preferences("  Talla M, me encanta el senderismo \n");

        assertThat(preferences.text()).isEqualTo("Talla M, me encanta el senderismo");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "\n\t"})
    @DisplayName("blank Preferences are no Preferences")
    void blankIsNone(String text) {
        assertThat(new Preferences(text)).isEqualTo(Preferences.NONE);
        assertThat(Preferences.NONE.text()).isNull();
    }

    @Test
    @DisplayName("Preferences can have up to 2000 characters")
    void upTo2000Characters() {
        assertThat(new Preferences("a".repeat(2000) + "  ").text()).hasSize(2000);
        assertThatThrownBy(() -> new Preferences("a".repeat(2001)))
                .isInstanceOf(InvalidPreferencesException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-preferences");
    }
}
