package com.secretmatch.group.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** A single gift exchange: its details, its Admin and its Members. */
public final class Group {

    /**
     * Where an Exchange Date starts and ends, for every Group alike. Not the Group's own {@link TimeZone}, which only
     * cuts its Mailbox Message dates.
     */
    public static final ZoneId TIME_ZONE = ZoneId.of("Europe/Madrid");

    private final GroupId id;
    private final GroupName name;
    private final LocalDate exchangeDate;
    private final Budget budget;
    private final TimeZone timeZone;
    private final MemberId admin;
    private final List<MemberId> members;
    private final InviteCode inviteCode;
    private final Instant createdAt;
    private final boolean drawn;

    /**
     * Rebuilds a stored Group; {@code budget} is {@code null} for a Group without one, and {@code drawn} says
     * whether its Draw is made.
     */
    public Group(
            GroupId id,
            GroupName name,
            LocalDate exchangeDate,
            Budget budget,
            TimeZone timeZone,
            MemberId admin,
            List<MemberId> members,
            InviteCode inviteCode,
            Instant createdAt,
            boolean drawn) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = Objects.requireNonNull(name, "name");
        this.exchangeDate = Objects.requireNonNull(exchangeDate, "exchangeDate");
        this.budget = budget;
        this.timeZone = Objects.requireNonNull(timeZone, "timeZone");
        this.admin = Objects.requireNonNull(admin, "admin");
        this.members = List.copyOf(members);
        this.inviteCode = Objects.requireNonNull(inviteCode, "inviteCode");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.drawn = drawn;
    }

    /**
     * A new Group whose creator is its Admin and its first Member.
     *
     * @param budget in euros; {@code null} for a Group without a budget
     * @param timeZone the IANA id of its {@link TimeZone}
     * @param inviteCode the code of its first Invite Link
     * @throws InvalidGroupDetailsException if a detail breaks its rules, e.g. the Exchange Date is not after
     *     today in {@link #TIME_ZONE}
     */
    public static Group create(
            String name,
            LocalDate exchangeDate,
            BigDecimal budget,
            String timeZone,
            MemberId creator,
            InviteCode inviteCode,
            Instant now) {
        if (!isInTheFuture(exchangeDate, now)) {
            throw InvalidGroupDetailsException.exchangeDate();
        }
        return new Group(
                GroupId.newId(),
                new GroupName(name),
                exchangeDate,
                budget == null ? null : new Budget(budget),
                new TimeZone(timeZone),
                creator,
                List.of(creator),
                inviteCode,
                now,
                false);
    }

    /**
     * Whether the Group is finished at {@code now}: from 00:00 in {@link #TIME_ZONE} on the day after its
     * Exchange Date it is read-only, and only its deletion is still allowed. Other modules reuse this rule for
     * their own read-only behaviour.
     */
    public boolean isFinished(Instant now) {
        return !now.isBefore(exchangeDate.plusDays(1).atStartOfDay(TIME_ZONE).toInstant());
    }

    /**
     * Checks that a User may join the Group through its Invite Link at {@code now}.
     *
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Group's Draw is made
     */
    public void authoriseJoin(Instant now) {
        requireNotFinished(now);
        requireNotDrawn();
    }

    /**
     * The same Group with a new Invite Link: the previous one stops working.
     *
     * @throws AdminOnlyException if {@code by} is not the Admin
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Group's Draw is made: its Invite Link no longer works anyway
     */
    public Group regenerateInviteLink(MemberId by, InviteCode newCode, Instant now) {
        if (!admin.equals(by)) {
            throw new AdminOnlyException();
        }
        requireNotFinished(now);
        requireNotDrawn();
        return new Group(id, name, exchangeDate, budget, timeZone, admin, members, newCode, createdAt, drawn);
    }

    /**
     * The same Group with new details, which replace all the current ones.
     *
     * @param newBudget in euros; {@code null} to leave the Group without a budget
     * @param newTimeZone the IANA id of its {@link TimeZone}
     * @throws AdminOnlyException if {@code by} is not the Admin
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Time Zone changes once the Draw is made: it is frozen then, like who is in
     *     the Group, so nobody can change it to probe when a Message was sent (ADR 0001)
     * @throws InvalidGroupDetailsException if a detail breaks its rules, e.g. a changed Exchange Date is not
     *     after today in {@link #TIME_ZONE}. An unchanged one is kept as it is, so on the Exchange Date itself
     *     the Admin can still rename the Group.
     */
    public Group edit(
            MemberId by,
            String newName,
            LocalDate newExchangeDate,
            BigDecimal newBudget,
            String newTimeZone,
            Instant now) {
        if (!admin.equals(by)) {
            throw new AdminOnlyException();
        }
        requireNotFinished(now);
        if (!exchangeDate.equals(newExchangeDate) && !isInTheFuture(newExchangeDate, now)) {
            throw InvalidGroupDetailsException.exchangeDate();
        }
        TimeZone changedTimeZone = new TimeZone(newTimeZone);
        if (drawn && !changedTimeZone.equals(timeZone)) {
            throw GroupDrawnException.timeZone();
        }
        return new Group(
                id,
                new GroupName(newName),
                newExchangeDate,
                newBudget == null ? null : new Budget(newBudget),
                changedTimeZone,
                admin,
                members,
                inviteCode,
                createdAt,
                drawn);
    }

    /**
     * The same Group without {@code member}: they leave it when {@code by} is themselves, or the Admin removes
     * them.
     *
     * @throws AdminCannotLeaveException if the Admin tries to leave
     * @throws AdminOnlyException if {@code by} removes someone else and is not the Admin
     * @throws MemberNotFoundException if {@code member} is not a Member
     * @throws GroupFinishedException if the Group is finished
     * @throws GroupDrawnException if the Group's Draw is made
     */
    public Group removeMember(MemberId by, MemberId member, Instant now) {
        if (admin.equals(member) && admin.equals(by)) {
            throw new AdminCannotLeaveException();
        }
        if (!by.equals(member) && !admin.equals(by)) {
            throw new AdminOnlyException();
        }
        if (!hasMember(member)) {
            throw new MemberNotFoundException();
        }
        requireNotFinished(now);
        requireNotDrawn();
        List<MemberId> remaining =
                members.stream().filter(other -> !other.equals(member)).toList();
        return new Group(id, name, exchangeDate, budget, timeZone, admin, remaining, inviteCode, createdAt, drawn);
    }

    /**
     * The same Group once its Draw is made: from then on nobody joins it, leaves it or is removed from it, so
     * no Assignment is ever left without its Giver or its Receiver (ADR 0001).
     */
    public Group markDrawn() {
        return new Group(id, name, exchangeDate, budget, timeZone, admin, members, inviteCode, createdAt, true);
    }

    /**
     * The same Group once its Draw is cancelled: back to how it was before the Draw, so Members join, leave and
     * are removed again, its Invite Link works again, and it can be drawn again.
     */
    public Group cancelDraw() {
        return new Group(id, name, exchangeDate, budget, timeZone, admin, members, inviteCode, createdAt, false);
    }

    /**
     * Checks that {@code by} may delete the Group, in any state, finished included.
     *
     * @return the Members to tell it is gone: everyone but the Admin, who deletes it
     * @throws AdminOnlyException if {@code by} is not the Admin
     */
    public List<MemberId> authoriseDeletion(MemberId by) {
        if (!admin.equals(by)) {
            throw new AdminOnlyException();
        }
        return members.stream().filter(member -> !member.equals(admin)).toList();
    }

    public GroupId id() {
        return id;
    }

    public GroupName name() {
        return name;
    }

    public LocalDate exchangeDate() {
        return exchangeDate;
    }

    public Optional<Budget> budget() {
        return Optional.ofNullable(budget);
    }

    public TimeZone timeZone() {
        return timeZone;
    }

    public MemberId admin() {
        return admin;
    }

    public List<MemberId> members() {
        return members;
    }

    public boolean hasMember(MemberId user) {
        return members.contains(user);
    }

    public InviteCode inviteCode() {
        return inviteCode;
    }

    public Instant createdAt() {
        return createdAt;
    }

    /** Whether the Group's Draw is made, which freezes its membership. */
    public boolean isDrawn() {
        return drawn;
    }

    private void requireNotFinished(Instant now) {
        if (isFinished(now)) {
            throw new GroupFinishedException();
        }
    }

    private void requireNotDrawn() {
        if (drawn) {
            throw new GroupDrawnException();
        }
    }

    private static boolean isInTheFuture(LocalDate date, Instant now) {
        return date != null && date.isAfter(LocalDate.ofInstant(now, TIME_ZONE));
    }
}
