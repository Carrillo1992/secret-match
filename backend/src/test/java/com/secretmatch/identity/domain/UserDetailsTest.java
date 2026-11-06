package com.secretmatch.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** The rules a User's email, display name and password follow, whatever the entry point. */
class UserDetailsTest {

    @Test
    void emailIsNormalised() {
        assertThat(new EmailAddress("  Ana.Garcia@Example.COM ").value()).isEqualTo("ana.garcia@example.com");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {"", "   ", "ana", "ana@", "@example.com", "ana@example", "ana garcia@example.com", "a@b@c.com"})
    void rejectsMalformedEmail(String text) {
        assertThatThrownBy(() -> new EmailAddress(text))
                .isInstanceOf(InvalidUserDetailsException.class)
                .extracting("code")
                .isEqualTo("invalid-email");
    }

    @Test
    void rejectsTooLongEmail() {
        String local = "a".repeat(64);
        String domain = "b".repeat(185) + ".com"; // 64 + 1 + 189 = 254
        assertThat(new EmailAddress(local + "@" + domain).value()).hasSize(254);

        assertThatThrownBy(() -> new EmailAddress(local + "@b" + domain))
                .isInstanceOf(InvalidUserDetailsException.class);
    }

    @Test
    void displayNameIsTrimmed() {
        assertThat(new DisplayName("  Abuela Carmen ").value()).isEqualTo("Abuela Carmen");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "    "})
    void rejectsBlankDisplayName(String text) {
        assertThatThrownBy(() -> new DisplayName(text))
                .isInstanceOf(InvalidUserDetailsException.class)
                .extracting("code")
                .isEqualTo("invalid-display-name");
    }

    @Test
    void displayNameLengthLimit() {
        assertThat(new DisplayName("x".repeat(50)).value()).hasSize(50);
        assertThatThrownBy(() -> new DisplayName("x".repeat(51))).isInstanceOf(InvalidUserDetailsException.class);
    }

    @Test
    void passwordMinimumLength() {
        assertThat(new NewPassword("12345678").value()).isEqualTo("12345678");
        assertThatThrownBy(() -> new NewPassword("1234567"))
                .isInstanceOf(InvalidUserDetailsException.class)
                .extracting("code")
                .isEqualTo("invalid-password");
    }

    @Test
    void passwordMaximumBytes() {
        assertThat(new NewPassword("a".repeat(72)).value()).hasSize(72);
        assertThatThrownBy(() -> new NewPassword("a".repeat(73))).isInstanceOf(InvalidUserDetailsException.class);
        // 37 'ñ' are 37 characters but 74 bytes.
        assertThatThrownBy(() -> new NewPassword("ñ".repeat(37))).isInstanceOf(InvalidUserDetailsException.class);
    }

    @Test
    void secretsNeverPrint() {
        assertThat(new NewPassword("correct horse").toString()).doesNotContain("correct horse");
        assertThat(new PasswordHash("$2a$10$abcdef").toString()).doesNotContain("abcdef");
        assertThatThrownBy(() -> new NewPassword("short")).message().doesNotContain("short");
    }
}
