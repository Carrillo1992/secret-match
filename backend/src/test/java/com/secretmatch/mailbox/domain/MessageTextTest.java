package com.secretmatch.mailbox.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class MessageTextTest {

    @Test
    @DisplayName("a Message keeps its text exactly as written")
    void keepsTheTextAsWritten() {
        MessageText text = new MessageText("  ¿Talla M o L?\n¡Gracias! ");

        assertThat(text.value()).isEqualTo("  ¿Talla M o L?\n¡Gracias! ");
    }

    @Test
    @DisplayName("a Message can be up to 1000 characters long")
    void acceptsAThousandCharacters() {
        assertThat(new MessageText("a".repeat(1000)).value()).hasSize(1000);
    }

    @Test
    @DisplayName("characters are counted as people see them, so 1000 emoji fit")
    void countsEmojiAsOneCharacter() {
        String thousandGifts = "🎁".repeat(1000);

        assertThat(new MessageText(thousandGifts).value()).isEqualTo(thousandGifts);
    }

    @Test
    @DisplayName("a Message over 1000 characters is rejected")
    void rejectsMoreThanAThousandCharacters() {
        assertThatThrownBy(() -> new MessageText("a".repeat(1001)))
                .isInstanceOf(InvalidMessageException.class)
                .extracting("code")
                .isEqualTo("invalid-message");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "   \n\t "})
    @DisplayName("an empty or blank Message is rejected, not trimmed into nothing")
    void rejectsEmptyOrBlankText(String text) {
        assertThatThrownBy(() -> new MessageText(text)).isInstanceOf(InvalidMessageException.class);
    }
}
