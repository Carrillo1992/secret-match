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
    private final Instant createdAt;

    /** Rebuilds a stored Group; {@code budget} is {@code null} for a Group without one. */
    public Group(
            GroupId id,
            GroupName name,
            LocalDate exchangeDate,
            Budget budget,
            MemberId admin,
            List<MemberId> members,
            Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = Objects.requireNonNull(name, "name");
        this.exchangeDate = Objects.requireNonNull(exchangeDate, "exchangeDate");
        this.budget = budget;
        this.admin = Objects.requireNonNull(admin, "admin");
        this.members = List.copyOf(members);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    /**
     * A new Group whose creator is its Admin and its first Member.
     *
     * @param budget in euros; {@code null} for a Group without a budget
     * @throws InvalidGroupDetailsException if a detail breaks its rules, e.g. the Exchange Date is not after
     *     today in {@link #TIME_ZONE}
     */
    public static Group create(String name, LocalDate exchangeDate, BigDecimal budget, MemberId creator, Instant now) {
        if (exchangeDate == null || !exchangeDate.isAfter(LocalDate.ofInstant(now, TIME_ZONE))) {
            throw InvalidGroupDetailsException.exchangeDate();
        }
        return new Group(
                GroupId.newId(),
                new GroupName(name),
                exchangeDate,
                budget == null ? null : new Budget(budget),
                creator,
                List.of(creator),
                now);
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

    public Instant createdAt() {
        return createdAt;
    }
}
