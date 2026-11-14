package com.secretmatch.wishlist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class WishTest {

    @Test
    @DisplayName("a Wish needs only a title; its priority is medium unless said otherwise")
    void onlyTheTitleIsRequired() {
        Wish wish = new Wish("  Bufanda de lana ", null, null, null, null);

        assertThat(wish.title()).isEqualTo("Bufanda de lana");
        assertThat(wish.link()).isNull();
        assertThat(wish.price()).isNull();
        assertThat(wish.notes()).isNull();
        assertThat(wish.priority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    @DisplayName("a Wish keeps its link, price to the cent, notes and priority; blank optional text counts as none")
    void keepsEveryField() {
        Wish wish = new Wish(
                "Auriculares",
                " https://tienda.example/auriculares?id=7 ",
                new BigDecimal("49.9"),
                " Negros ",
                Priority.HIGH);
        Wish blank = new Wish("Libro", "  ", null, " ", Priority.LOW);

        assertThat(wish.link()).isEqualTo("https://tienda.example/auriculares?id=7");
        assertThat(wish.price()).isEqualTo(new BigDecimal("49.90"));
        assertThat(wish.notes()).isEqualTo("Negros");
        assertThat(wish.priority()).isEqualTo(Priority.HIGH);
        assertThat(blank.link()).isNull();
        assertThat(blank.notes()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    @DisplayName("a Wish without a title is rejected")
    void rejectsABlankTitle(String title) {
        assertThatThrownBy(() -> new Wish(title, null, null, null, null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-title");
    }

    @Test
    @DisplayName("a title of 100 characters is accepted, one of 101 rejected")
    void limitsTheTitle() {
        assertThat(new Wish("a".repeat(100), null, null, null, null).title()).hasSize(100);
        assertThatThrownBy(() -> new Wish("a".repeat(101), null, null, null, null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-title");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "javascript:alert(1)",
                "JavaScript:alert(1)",
                "data:text/html,<script>alert(1)</script>",
                "ftp://example.com/file",
                "mailto:someone@example.com",
                "//example.com/no-scheme",
                "tienda.example/sin-esquema",
                "https://",
                "http:///solo-ruta",
                "https://exa mple.com"
            })
    @DisplayName("a link that is not an http or https address is rejected")
    void rejectsNonHttpLinks(String link) {
        assertThatThrownBy(() -> new Wish("Regalo", link, null, null, null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-link");
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://example.com", "HTTPS://Example.com/a/b?c=d#e"})
    @DisplayName("http and https links are accepted, in any case")
    void acceptsHttpLinks(String link) {
        assertThat(new Wish("Regalo", link, null, null, null).link()).isEqualTo(link);
    }

    @Test
    @DisplayName("a link of 2000 characters is accepted, one of 2001 rejected")
    void limitsTheLink() {
        String prefix = "https://example.com/";
        String longest = prefix + "a".repeat(2000 - prefix.length());

        assertThat(new Wish("Regalo", longest, null, null, null).link()).hasSize(2000);
        assertThatThrownBy(() -> new Wish("Regalo", longest + "a", null, null, null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-link");
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.01", "1000000", "10.005"})
    @DisplayName("a price that is negative, a million euros or more, or below the cent is rejected")
    void rejectsInvalidPrices(String price) {
        assertThatThrownBy(() -> new Wish("Regalo", null, new BigDecimal(price), null, null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-price");
    }

    @Test
    @DisplayName("a free Wish and one just under a million euros are accepted")
    void acceptsPricesInRange() {
        assertThat(new Wish("Regalo", null, BigDecimal.ZERO, null, null).price())
                .isEqualTo(new BigDecimal("0.00"));
        assertThat(new Wish("Regalo", null, new BigDecimal("999999.99"), null, null).price())
                .isEqualTo(new BigDecimal("999999.99"));
    }

    @Test
    @DisplayName("notes of 1000 characters are accepted, of 1001 rejected")
    void limitsTheNotes() {
        assertThat(new Wish("Regalo", null, null, "n".repeat(1000), null).notes())
                .hasSize(1000);
        assertThatThrownBy(() -> new Wish("Regalo", null, null, "n".repeat(1001), null))
                .isInstanceOf(InvalidWishException.class)
                .hasFieldOrPropertyWithValue("code", "invalid-wish-notes");
    }
}
