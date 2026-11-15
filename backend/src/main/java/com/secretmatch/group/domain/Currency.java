package com.secretmatch.group.domain;

/**
 * The money a Group's amounts are in: its Budget and the prices of the Wishes in it. Named by its ISO 4217 code.
 * Changing it relabels those amounts, it never converts them.
 */
public enum Currency {
    EUR,
    USD
}
