package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The details typed into the edit-Group form, which replace all the current ones; {@code budget} is
 * {@code null} when left empty, {@code timeZone} is the IANA id of the Group's Time Zone.
 */
public record EditGroupCommand(String name, LocalDate exchangeDate, BigDecimal budget, String timeZone) {}
