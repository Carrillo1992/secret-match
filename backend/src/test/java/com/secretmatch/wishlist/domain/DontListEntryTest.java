package com.secretmatch.wishlist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class DontListEntryTest {

    @Test
    @DisplayName("a Don't List entry keeps its text, without surrounding spaces")
    void keepsTheText() {
        assertThat(new DontListEntry("  nada de chocolate ").text()).isEqualTo("nada de chocolate");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "\n\t"})
    @DisplayName("an empty Don't List entry is rejected")
    void rejectsAnEmptyEntry(String text) {
        assertThatThrownBy(() -> new DontListEntry(text))
                .isInstanceOf(InvalidDontListEntryException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-dont-list-entry");
    }

    @Test
    @DisplayName("a Don't List entry can have up to 100 characters")
    void upTo100Characters() {
        assertThat(new DontListEntry(" " + "a".repeat(100) + " ").text()).hasSize(100);
        assertThatThrownBy(() -> new DontListEntry("a".repeat(101))).isInstanceOf(InvalidDontListEntryException.class);
    }
}
