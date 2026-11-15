package com.secretmatch.group.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * How much each gift should cost, in the Group's {@link Currency}, kept to the cent. Informational only: nothing is
 * checked against it.
 */
public record Budget(BigDecimal amount) {

    /** The budget must be below this: a million. */
    public static final BigDecimal LIMIT = new BigDecimal("1000000");

    public Budget {
        if (amount == null
                || amount.signum() < 0
                || amount.compareTo(LIMIT) >= 0
                || amount.stripTrailingZeros().scale() > 2) {
            throw InvalidGroupDetailsException.budget();
        }
        amount = amount.setScale(2, RoundingMode.UNNECESSARY);
    }
}
