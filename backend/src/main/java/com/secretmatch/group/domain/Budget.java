package com.secretmatch.group.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * How much each gift should cost, in euros, kept to the cent. Informational only: nothing is checked against
 * it.
 */
public record Budget(BigDecimal euros) {

    /** The budget must be below this: a million euros. */
    public static final BigDecimal LIMIT = new BigDecimal("1000000");

    public Budget {
        if (euros == null
                || euros.signum() < 0
                || euros.compareTo(LIMIT) >= 0
                || euros.stripTrailingZeros().scale() > 2) {
            throw InvalidGroupDetailsException.budget();
        }
        euros = euros.setScale(2, RoundingMode.UNNECESSARY);
    }
}
