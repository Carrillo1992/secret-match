package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The details typed into the edit-Group form, which replace all the current ones; {@code budget} is
 * {@code null} when left empty.
 */
public record EditGroupCommand(String name, LocalDate exchangeDate, BigDecimal budget) {}
