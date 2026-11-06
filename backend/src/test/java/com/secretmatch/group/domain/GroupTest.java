package com.secretmatch.group.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class GroupTest {

    /** Still the 1st of December in UTC, but already the 2nd in Madrid (UTC+1). */
    private static final Instant NOW = Instant.parse("2026-12-01T23:30:00Z");

    private static final LocalDate CHRISTMAS_EVE = LocalDate.of(2026, 12, 24);

    private static final MemberId CREATOR = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000001"));

    @Test
    @DisplayName("the User who creates a Group is its Admin and its only Member")
    void creatorIsAdminAndMember() {
        Group group = Group.create("Navidad en casa", CHRISTMAS_EVE, null, CREATOR, NOW);

        assertThat(group.admin()).isEqualTo(CREATOR);
        assertThat(group.members()).containsExactly(CREATOR);
        assertThat(group.name().value()).isEqualTo("Navidad en casa");
        assertThat(group.exchangeDate()).isEqualTo(CHRISTMAS_EVE);
        assertThat(group.budget()).isEmpty();
        assertThat(group.createdAt()).isEqualTo(NOW);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   "})
    @DisplayName("a Group needs a name")
    void nameIsRequired(String name) {
        assertThatThrownBy(() -> Group.create(name, CHRISTMAS_EVE, null, CREATOR, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("invalid-group-name");
    }

    @Test
    @DisplayName("the name is trimmed and may have up to 80 characters")
    void nameLength() {
        assertThat(Group.create("  Amigos  ", CHRISTMAS_EVE, null, CREATOR, NOW)
                        .name()
                        .value())
                .isEqualTo("Amigos");
        assertThat(Group.create("a".repeat(80), CHRISTMAS_EVE, null, CREATOR, NOW))
                .isNotNull();
        assertThatThrownBy(() -> Group.create("a".repeat(81), CHRISTMAS_EVE, null, CREATOR, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class);
    }

    @Test
    @DisplayName("the Exchange Date must be after today in Madrid")
    void exchangeDateMustBeInTheFuture() {
        assertThat(Group.create("Amigos", LocalDate.of(2026, 12, 3), null, CREATOR, NOW))
                .isNotNull();
        for (LocalDate notInTheFuture :
                new LocalDate[] {LocalDate.of(2026, 12, 2), LocalDate.of(2026, 12, 1), LocalDate.of(2025, 12, 24)}) {
            assertThatThrownBy(() -> Group.create("Amigos", notInTheFuture, null, CREATOR, NOW))
                    .as(notInTheFuture.toString())
                    .isInstanceOf(InvalidGroupDetailsException.class)
                    .extracting(e -> ((InvalidGroupDetailsException) e).code())
                    .isEqualTo("exchange-date-not-in-future");
        }
    }

    @Test
    @DisplayName("a Group needs an Exchange Date")
    void exchangeDateIsRequired() {
        assertThatThrownBy(() -> Group.create("Amigos", null, null, CREATOR, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("exchange-date-not-in-future");
    }

    @Test
    @DisplayName("the budget is kept in euros, and may be zero")
    void budgetIsKept() {
        assertThat(Group.create("Amigos", CHRISTMAS_EVE, new BigDecimal("25.50"), CREATOR, NOW)
                        .budget())
                .contains(new Budget(new BigDecimal("25.50")));
        assertThat(Group.create("Amigos", CHRISTMAS_EVE, BigDecimal.ZERO, CREATOR, NOW)
                        .budget())
                .isPresent();
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.01", "-20", "10.001", "1000000"})
    @DisplayName("a negative budget, one with fractions of a cent, or one of a million euros or more is refused")
    void invalidBudget(String euros) {
        assertThatThrownBy(() -> Group.create("Amigos", CHRISTMAS_EVE, new BigDecimal(euros), CREATOR, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("invalid-budget");
    }
}
