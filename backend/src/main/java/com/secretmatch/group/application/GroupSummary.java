package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One of a User's Groups, as "Mis grupos" lists it. {@code budget} is {@code null} when the Group has none;
 * {@code admin} says whether that User is its Admin.
 */
public record GroupSummary(
        UUID id, String name, LocalDate exchangeDate, BigDecimal budget, int memberCount, boolean admin) {}
