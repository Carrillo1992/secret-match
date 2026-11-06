package com.secretmatch.group.application;

import java.math.BigDecimal;
import java.time.LocalDate;

/** The details typed into the create-Group form; {@code budget} is {@code null} when left empty. */
public record CreateGroupCommand(String name, LocalDate exchangeDate, BigDecimal budget) {}
