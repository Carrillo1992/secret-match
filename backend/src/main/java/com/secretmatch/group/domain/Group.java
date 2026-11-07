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

    /** Where a calendar day starts and ends for every Group: the app runs on one fixed time zone. */
    public static final ZoneId TIME_ZONE = ZoneId.of("Europe/Madrid");

    private final GroupId id;
    private final GroupName name;
    private final LocalDate exchangeDate;
    private final Budget budget;
    private final MemberId admin;
    private final List<MemberId> members;
    private final InviteCode inviteCode;
    private final Instant createdAt;

    /** Rebuilds a stored Group; {@code budget} is {@code null} for a Group without one. */
    public Group(
            GroupId id,
            GroupName name,
            LocalDate exchangeDate,
            Budget budget,
            MemberId admin,
            List<MemberId> members,
            InviteCode inviteCode,
            Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = Objects.requireNonNull(name, "name");
        this.exchangeDate = Objects.requireNonNull(exchangeDate, "exchangeDate");
        this.budget = budget;
        this.admin = Objects.requireNonNull(admin, "admin");
        this.members = List.copyOf(members);
        this.inviteCode = Objects.requireNonNull(inviteCode, "inviteCode");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    /**
     * A new Group whose creator is its Admin and its first Member.
     *
     * @param budget in euros; {@code null} for a Group without a budget
     * @param inviteCode the code of its first Invite Link
     * @throws InvalidGroupDetailsException if a detail breaks its rules, e.g. the Exchange Date is not after
     *     today in {@link #TIME_ZONE}
     */
    public static Group create(
            String name,
            LocalDate exchangeDate,
            BigDecimal budget,
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
                creator,
                List.of(creator),
                inviteCode,
                now);
    }

    /**
     * The same Group with a new Invite Link: the previous one stops working.
     *
     * @throws AdminOnlyException if {@code by} is not the Admin
     */
    public Group regenerateInviteLink(MemberId by, InviteCode newCode) {
        if (!admin.equals(by)) {
            throw new AdminOnlyException();
        }
        return new Group(id, name, exchangeDate, budget, admin, members, newCode, createdAt);
    }

    /**
     * The same Group with new details, which replace all the current ones.
     *
     * @param newBudget in euros; {@code null} to leave the Group without a budget
     * @throws AdminOnlyException if {@code by} is not the Admin
     * @throws InvalidGroupDetailsException if a detail breaks its rules, e.g. a changed Exchange Date is not
     *     after today in {@link #TIME_ZONE}. An unchanged one is kept as it is, so on the Exchange Date itself
     *     the Admin can still rename the Group.
     */
    public Group edit(MemberId by, String newName, LocalDate newExchangeDate, BigDecimal newBudget, Instant now) {
        if (!admin.equals(by)) {
            throw new AdminOnlyException();
        }
        if (!exchangeDate.equals(newExchangeDate) && !isInTheFuture(newExchangeDate, now)) {
            throw InvalidGroupDetailsException.exchangeDate();
        }
        return new Group(
                id,
                new GroupName(newName),
                newExchangeDate,
                newBudget == null ? null : new Budget(newBudget),
                admin,
                members,
                inviteCode,
                createdAt);
    }

    /**
     * The same Group without {@code member}: they leave it when {@code by} is themselves, or the Admin removes
     * them.
     *
     * @throws AdminCannotLeaveException if the Admin tries to leave
     * @throws AdminOnlyException if {@code by} removes someone else and is not the Admin
     * @throws MemberNotFoundException if {@code member} is not a Member
     */
    public Group removeMember(MemberId by, MemberId member) {
        if (admin.equals(member) && admin.equals(by)) {
            throw new AdminCannotLeaveException();
        }
        if (!by.equals(member) && !admin.equals(by)) {
            throw new AdminOnlyException();
        }
        if (!hasMember(member)) {
            throw new MemberNotFoundException();
        }
        List<MemberId> remaining =
                members.stream().filter(other -> !other.equals(member)).toList();
        return new Group(id, name, exchangeDate, budget, admin, remaining, inviteCode, createdAt);
    }

    /**
     * Checks that {@code by} may delete the Group, in any state.
     *
     * @return the Members to tell it is gone: everyone but the Admin, who deletes it
     * @throws AdminOnlyException if {@code by} is not the Admin
     */
    public List<MemberId> delete(MemberId by) {
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

    private static boolean isInTheFuture(LocalDate date, Instant now) {
        return date != null && date.isAfter(LocalDate.ofInstant(now, TIME_ZONE));
    }
}
