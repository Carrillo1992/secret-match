package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One of a User's Groups, as "Mis grupos" lists it. {@code budget} is {@code null} when the Group has none;
 * {@code admin} says whether that User is its Admin, and {@code finished} whether its Exchange Date is over.
 */
public record GroupSummary(
        UUID id,
        String name,
        LocalDate exchangeDate,
        BigDecimal budget,
        int memberCount,
        boolean admin,
        boolean finished) {}
