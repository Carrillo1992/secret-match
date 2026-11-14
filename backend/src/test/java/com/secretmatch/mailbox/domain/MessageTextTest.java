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
    @DisplayName("characters are counted in code points, as the database does, so 1000 emoji fit")
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

    @ParameterizedTest
    @ValueSource(strings = {"\u00a0", "\u200b", "\ufeff", " \u200b\u00a0\u2007\u202f\u200d\n "})
    @DisplayName("a Message of only invisible characters (no-break or zero-width spaces, a BOM) is rejected")
    void rejectsInvisibleOnlyText(String text) {
        assertThatThrownBy(() -> new MessageText(text)).isInstanceOf(InvalidMessageException.class);
    }

    @Test
    @DisplayName("invisible characters around visible text are kept")
    void keepsInvisibleCharactersAroundText() {
        assertThat(new MessageText("\u00a0hola\u200b").value()).isEqualTo("\u00a0hola\u200b");
    }

    @ParameterizedTest
    @ValueSource(strings = {"hola\u0000", "\u0001hola", "ho\u0007la", "hola\u001b[31m", "hola\u007f"})
    @DisplayName("a Message with a NUL or another control character is rejected")
    void rejectsControlCharacters(String text) {
        assertThatThrownBy(() -> new MessageText(text)).isInstanceOf(InvalidMessageException.class);
    }

    @Test
    @DisplayName("line breaks and tabs are allowed")
    void allowsLineBreaksAndTabs() {
        assertThat(new MessageText("una\r\ndos\n\ttres").value()).isEqualTo("una\r\ndos\n\ttres");
    }
}
