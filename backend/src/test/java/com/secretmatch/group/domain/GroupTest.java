package com.secretmatch.group.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class GroupTest {

    /** Still the 1st of December in UTC, but already the 2nd in Madrid (UTC+1). */
    private static final Instant NOW = Instant.parse("2026-12-01T23:30:00Z");

    private static final LocalDate CHRISTMAS_EVE = LocalDate.of(2026, 12, 24);

    /** 00:00 on Christmas Day in Madrid: a Group exchanging on Christmas Eve is finished. */
    private static final Instant AFTER_CHRISTMAS_EVE = Instant.parse("2026-12-24T23:00:00Z");

    private static final MemberId CREATOR = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000001"));

    private static final MemberId GUEST = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000002"));

    private static final InviteCode FIRST_CODE = new InviteCode("first-code");

    @Test
    @DisplayName("the User who creates a Group is its Admin and its only Member")
    void creatorIsAdminAndMember() {
        Group group = Group.create("Navidad en casa", CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW);

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
        assertThatThrownBy(() -> Group.create(name, CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("invalid-group-name");
    }

    @Test
    @DisplayName("the name is trimmed and may have up to 80 characters")
    void nameLength() {
        assertThat(Group.create("  Amigos  ", CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW)
                        .name()
                        .value())
                .isEqualTo("Amigos");
        assertThat(Group.create("a".repeat(80), CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW))
                .isNotNull();
        assertThatThrownBy(() -> Group.create("a".repeat(81), CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class);
    }

    @Test
    @DisplayName("the Exchange Date must be after today in Madrid")
    void exchangeDateMustBeInTheFuture() {
        assertThat(Group.create("Amigos", LocalDate.of(2026, 12, 3), null, CREATOR, FIRST_CODE, NOW))
                .isNotNull();
        for (LocalDate notInTheFuture :
                new LocalDate[] {LocalDate.of(2026, 12, 2), LocalDate.of(2026, 12, 1), LocalDate.of(2025, 12, 24)}) {
            assertThatThrownBy(() -> Group.create("Amigos", notInTheFuture, null, CREATOR, FIRST_CODE, NOW))
                    .as(notInTheFuture.toString())
                    .isInstanceOf(InvalidGroupDetailsException.class)
                    .extracting(e -> ((InvalidGroupDetailsException) e).code())
                    .isEqualTo("exchange-date-not-in-future");
        }
    }

    @Test
    @DisplayName("a Group needs an Exchange Date")
    void exchangeDateIsRequired() {
        assertThatThrownBy(() -> Group.create("Amigos", null, null, CREATOR, FIRST_CODE, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("exchange-date-not-in-future");
    }

    @Test
    @DisplayName("the budget is kept in euros, and may be zero")
    void budgetIsKept() {
        assertThat(Group.create("Amigos", CHRISTMAS_EVE, new BigDecimal("25.50"), CREATOR, FIRST_CODE, NOW)
                        .budget())
                .contains(new Budget(new BigDecimal("25.50")));
        assertThat(Group.create("Amigos", CHRISTMAS_EVE, BigDecimal.ZERO, CREATOR, FIRST_CODE, NOW)
                        .budget())
                .isPresent();
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.01", "-20", "10.001", "1000000"})
    @DisplayName("a negative budget, one with fractions of a cent, or one of a million euros or more is refused")
    void invalidBudget(String euros) {
        assertThatThrownBy(() -> Group.create("Amigos", CHRISTMAS_EVE, new BigDecimal(euros), CREATOR, FIRST_CODE, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class)
                .extracting(e -> ((InvalidGroupDetailsException) e).code())
                .isEqualTo("invalid-budget");
    }

    @Test
    @DisplayName("a new Group starts with the Invite Link it was given")
    void newGroupHasItsInviteLink() {
        Group group = Group.create("Amigos", CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW);

        assertThat(group.inviteCode()).isEqualTo(FIRST_CODE);
    }

    @Test
    @DisplayName("the Admin can regenerate the Invite Link, which replaces the previous one")
    void adminRegeneratesInviteLink() {
        Group group = Group.create("Amigos", CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW);

        Group regenerated = group.regenerateInviteLink(CREATOR, new InviteCode("second-code"), NOW);

        assertThat(regenerated.inviteCode()).isEqualTo(new InviteCode("second-code"));
        assertThat(regenerated.id()).isEqualTo(group.id());
        assertThat(regenerated.members()).containsExactly(CREATOR);
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot regenerate the Invite Link")
    void onlyAdminRegeneratesInviteLink() {
        Group group = new Group(
                GroupId.newId(),
                new GroupName("Amigos"),
                CHRISTMAS_EVE,
                null,
                CREATOR,
                List.of(CREATOR, GUEST),
                FIRST_CODE,
                NOW,
                false);

        assertThatThrownBy(() -> group.regenerateInviteLink(GUEST, new InviteCode("second-code"), NOW))
                .isInstanceOf(AdminOnlyException.class)
                .extracting(e -> ((AdminOnlyException) e).code())
                .isEqualTo("admin-only");
    }

    @Test
    @DisplayName("a generated Invite Link code is long, random and fits in a link")
    void generatedCodes() {
        java.security.SecureRandom random = new java.security.SecureRandom();
        InviteCode one = InviteCode.generate(random);
        InviteCode other = InviteCode.generate(random);

        assertThat(one.value()).matches("[A-Za-z0-9_-]{22}");
        assertThat(one).isNotEqualTo(other);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "with space", "slash/inside", "ñ"})
    @DisplayName("a code that could not have come from an Invite Link is not one")
    void malformedCodes(String value) {
        assertThat(InviteCode.parse(value)).isEmpty();
    }

    private static final MemberId OTHER_GUEST = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000003"));

    private static Group withGuests() {
        Group created = Group.create("Amigos", CHRISTMAS_EVE, null, CREATOR, FIRST_CODE, NOW);
        return new Group(
                created.id(),
                created.name(),
                created.exchangeDate(),
                null,
                CREATOR,
                List.of(CREATOR, GUEST, OTHER_GUEST),
                FIRST_CODE,
                NOW,
                false);
    }

    @Test
    @DisplayName("a Member who is not the Admin leaves the Group")
    void memberLeaves() {
        Group left = withGuests().removeMember(GUEST, GUEST, NOW);

        assertThat(left.members()).containsExactly(CREATOR, OTHER_GUEST);
    }

    @Test
    @DisplayName("the Admin removes another Member")
    void adminRemovesAMember() {
        Group removed = withGuests().removeMember(CREATOR, OTHER_GUEST, NOW);

        assertThat(removed.members()).containsExactly(CREATOR, GUEST);
    }

    @Test
    @DisplayName("the Admin cannot leave their own Group")
    void adminCannotLeave() {
        assertThatThrownBy(() -> withGuests().removeMember(CREATOR, CREATOR, NOW))
                .isInstanceOf(AdminCannotLeaveException.class)
                .extracting(e -> ((AdminCannotLeaveException) e).code())
                .isEqualTo("admin-cannot-leave");
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot remove anyone else")
    void onlyTheAdminRemoves() {
        assertThatThrownBy(() -> withGuests().removeMember(GUEST, OTHER_GUEST, NOW))
                .isInstanceOf(AdminOnlyException.class);
        assertThatThrownBy(() -> withGuests().removeMember(GUEST, CREATOR, NOW)).isInstanceOf(AdminOnlyException.class);
    }

    @Test
    @DisplayName("removing someone who is not a Member is refused as not found")
    void removingANonMember() {
        MemberId stranger = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000009"));

        assertThatThrownBy(() -> withGuests().removeMember(CREATOR, stranger, NOW))
                .isInstanceOf(MemberNotFoundException.class)
                .isInstanceOf(com.secretmatch.shared.domain.NotFoundException.class);
    }

    @Test
    @DisplayName("the Admin changes the name, the budget and the Exchange Date")
    void adminEditsTheDetails() {
        Group group = withGuests();

        Group edited = group.edit(CREATOR, "  Reyes  ", LocalDate.of(2027, 1, 6), new BigDecimal("30"), NOW);

        assertThat(edited.name().value()).isEqualTo("Reyes");
        assertThat(edited.exchangeDate()).isEqualTo(LocalDate.of(2027, 1, 6));
        assertThat(edited.budget()).contains(new Budget(new BigDecimal("30.00")));
        assertThat(edited.id()).isEqualTo(group.id());
        assertThat(edited.members()).containsExactly(CREATOR, GUEST, OTHER_GUEST);
        assertThat(edited.inviteCode()).isEqualTo(FIRST_CODE);
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot edit the Group")
    void onlyTheAdminEdits() {
        assertThatThrownBy(() -> withGuests().edit(GUEST, "Reyes", CHRISTMAS_EVE, null, NOW))
                .isInstanceOf(AdminOnlyException.class);
    }

    @Test
    @DisplayName("a new Exchange Date must be after today in Madrid")
    void newExchangeDateMustBeInTheFuture() {
        assertThat(withGuests()
                        .edit(CREATOR, "Amigos", LocalDate.of(2026, 12, 3), null, NOW)
                        .exchangeDate())
                .isEqualTo(LocalDate.of(2026, 12, 3));
        for (LocalDate notInTheFuture : new LocalDate[] {LocalDate.of(2026, 12, 2), LocalDate.of(2026, 11, 30)}) {
            assertThatThrownBy(() -> withGuests().edit(CREATOR, "Amigos", notInTheFuture, null, NOW))
                    .as(notInTheFuture.toString())
                    .isInstanceOf(InvalidGroupDetailsException.class)
                    .extracting(e -> ((InvalidGroupDetailsException) e).code())
                    .isEqualTo("exchange-date-not-in-future");
        }
        assertThatThrownBy(() -> withGuests().edit(CREATOR, "Amigos", null, null, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class);
    }

    @Test
    @DisplayName("on the Exchange Date itself the Admin can still rename the Group, keeping that date")
    void keepingTodaysExchangeDate() {
        Instant onTheDay = Instant.parse("2026-12-24T18:00:00Z");

        Group edited = withGuests().edit(CREATOR, "Nochebuena", CHRISTMAS_EVE, null, onTheDay);

        assertThat(edited.name().value()).isEqualTo("Nochebuena");
        assertThat(edited.exchangeDate()).isEqualTo(CHRISTMAS_EVE);
    }

    @Test
    @DisplayName("the Admin can take the budget away, and an invalid name or budget is refused")
    void budgetAndNameOnEdit() {
        Group withBudget = withGuests().edit(CREATOR, "Amigos", CHRISTMAS_EVE, new BigDecimal("20"), NOW);

        assertThat(withBudget.edit(CREATOR, "Amigos", CHRISTMAS_EVE, null, NOW).budget())
                .isEmpty();
        assertThatThrownBy(() -> withBudget.edit(CREATOR, " ", CHRISTMAS_EVE, null, NOW))
                .isInstanceOf(InvalidGroupDetailsException.class);
        assertThatThrownBy(() -> withBudget.edit(CREATOR, "Amigos", CHRISTMAS_EVE, new BigDecimal("-1"), NOW))
                .isInstanceOf(InvalidGroupDetailsException.class);
    }

    @Test
    @DisplayName("the Admin deletes the Group, and every other Member is to be told")
    void adminDeletes() {
        assertThat(withGuests().authoriseDeletion(CREATOR)).containsExactly(GUEST, OTHER_GUEST);
    }

    @Test
    @DisplayName("a Member who is not the Admin cannot delete the Group")
    void onlyTheAdminDeletes() {
        assertThatThrownBy(() -> withGuests().authoriseDeletion(GUEST)).isInstanceOf(AdminOnlyException.class);
    }

    // ---------- a finished Group ----------

    private static Group exchangingOn(LocalDate exchangeDate) {
        return new Group(
                GroupId.newId(),
                new GroupName("Amigos"),
                exchangeDate,
                null,
                CREATOR,
                List.of(CREATOR, GUEST, OTHER_GUEST),
                FIRST_CODE,
                NOW,
                false);
    }

    @ParameterizedTest(name = "Exchange Date {0}: still open at {1}, finished at {2}")
    @CsvSource({
        // Winter, Madrid is UTC+1.
        "2026-12-24, 2026-12-24T22:59:59Z, 2026-12-24T23:00:00Z",
        // Summer, Madrid is UTC+2.
        "2027-07-15, 2027-07-15T21:59:59Z, 2027-07-15T22:00:00Z",
        // Clocks go back on 2026-10-25 at 03:00: that day lasts 25 hours, and it starts in UTC+2 but ends in UTC+1.
        "2026-10-25, 2026-10-25T22:59:59Z, 2026-10-25T23:00:00Z",
        // Clocks go forward on 2027-03-28 at 02:00: that day lasts 23 hours, and ends in UTC+2.
        "2027-03-28, 2027-03-28T21:59:59Z, 2027-03-28T22:00:00Z"
    })
    @DisplayName("a Group is finished from 00:00 in Madrid on the day after its Exchange Date")
    void finishedFromTheDayAfterTheExchangeDate(
            LocalDate exchangeDate, Instant lastOpenMoment, Instant firstFinishedMoment) {
        Group group = exchangingOn(exchangeDate);

        assertThat(group.isFinished(lastOpenMoment)).isFalse();
        assertThat(group.isFinished(firstFinishedMoment)).isTrue();
        assertThat(group.isFinished(firstFinishedMoment.plusSeconds(86_400 * 30)))
                .isTrue();
    }

    @Test
    @DisplayName("a Group is not finished long before its Exchange Date, nor on the day itself")
    void notFinishedBefore() {
        Group group = exchangingOn(CHRISTMAS_EVE);

        assertThat(group.isFinished(NOW)).isFalse();
        assertThat(group.isFinished(Instant.parse("2026-12-23T23:00:00Z"))).isFalse();
    }

    @Test
    @DisplayName("on a finished Group nobody can edit it, regenerate its Invite Link, leave it or be removed")
    void finishedGroupIsReadOnly() {
        Group group = exchangingOn(CHRISTMAS_EVE);

        assertThatThrownBy(() -> group.edit(CREATOR, "Reyes", CHRISTMAS_EVE, null, AFTER_CHRISTMAS_EVE))
                .isInstanceOf(GroupFinishedException.class)
                .extracting(e -> ((GroupFinishedException) e).code())
                .isEqualTo("group-finished");
        assertThatThrownBy(
                        () -> group.regenerateInviteLink(CREATOR, new InviteCode("second-code"), AFTER_CHRISTMAS_EVE))
                .isInstanceOf(GroupFinishedException.class);
        assertThatThrownBy(() -> group.removeMember(GUEST, GUEST, AFTER_CHRISTMAS_EVE))
                .isInstanceOf(GroupFinishedException.class);
        assertThatThrownBy(() -> group.removeMember(CREATOR, OTHER_GUEST, AFTER_CHRISTMAS_EVE))
                .isInstanceOf(GroupFinishedException.class);
        assertThatThrownBy(() -> group.authoriseJoin(AFTER_CHRISTMAS_EVE)).isInstanceOf(GroupFinishedException.class);
    }

    @Test
    @DisplayName("until the end of its Exchange Date a Group can still be joined, left and changed")
    void openOnTheLastMoment() {
        Group group = exchangingOn(CHRISTMAS_EVE);
        Instant lastMoment = Instant.parse("2026-12-24T22:59:59Z");

        assertThat(group.edit(CREATOR, "Nochebuena", CHRISTMAS_EVE, null, lastMoment)
                        .name()
                        .value())
                .isEqualTo("Nochebuena");
        assertThat(group.regenerateInviteLink(CREATOR, new InviteCode("second-code"), lastMoment)
                        .inviteCode())
                .isEqualTo(new InviteCode("second-code"));
        assertThat(group.removeMember(GUEST, GUEST, lastMoment).members()).containsExactly(CREATOR, OTHER_GUEST);
        assertThatCode(() -> group.authoriseJoin(lastMoment)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("the Admin can still delete a finished Group")
    void finishedGroupCanBeDeleted() {
        assertThat(exchangingOn(CHRISTMAS_EVE).authoriseDeletion(CREATOR)).containsExactly(GUEST, OTHER_GUEST);
    }

    // ---------- a drawn Group ----------

    @Test
    @DisplayName("a new Group has no Draw yet, and marking it drawn changes nothing else")
    void markedDrawn() {
        Group group = withGuests();

        Group drawn = group.markDrawn();

        assertThat(group.isDrawn()).isFalse();
        assertThat(drawn.isDrawn()).isTrue();
        assertThat(drawn.members()).isEqualTo(group.members());
        assertThat(drawn.inviteCode()).isEqualTo(group.inviteCode());
    }

    @Test
    @DisplayName("on a drawn Group nobody joins, leaves or is removed, and its Invite Link cannot be regenerated")
    void drawnGroupIsFrozen() {
        Group drawn = withGuests().markDrawn();

        assertThatThrownBy(() -> drawn.authoriseJoin(NOW))
                .isInstanceOf(GroupDrawnException.class)
                .extracting(e -> ((GroupDrawnException) e).code())
                .isEqualTo("group-drawn");
        assertThatThrownBy(() -> drawn.removeMember(GUEST, GUEST, NOW)).isInstanceOf(GroupDrawnException.class);
        assertThatThrownBy(() -> drawn.removeMember(CREATOR, OTHER_GUEST, NOW)).isInstanceOf(GroupDrawnException.class);
        assertThatThrownBy(() -> drawn.regenerateInviteLink(CREATOR, new InviteCode("second-code"), NOW))
                .isInstanceOf(GroupDrawnException.class);
    }

    @Test
    @DisplayName("the Admin can still edit and delete a drawn Group")
    void drawnGroupCanBeEditedAndDeleted() {
        Group drawn = withGuests().markDrawn();

        Group edited = drawn.edit(CREATOR, "Nochebuena", CHRISTMAS_EVE, null, NOW);

        assertThat(edited.name().value()).isEqualTo("Nochebuena");
        assertThat(edited.isDrawn()).isTrue();
        assertThat(drawn.authoriseDeletion(CREATOR)).containsExactly(GUEST, OTHER_GUEST);
    }
}
