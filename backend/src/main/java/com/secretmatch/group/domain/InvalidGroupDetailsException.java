package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;
import java.util.Arrays;

/** A Group name, Exchange Date, budget, Currency or Time Zone that breaks its rules. */
public class InvalidGroupDetailsException extends DomainException {

    private InvalidGroupDetailsException(String code, String message) {
        super(code, message);
    }

    static InvalidGroupDetailsException name() {
        return new InvalidGroupDetailsException(
                "invalid-group-name",
                "The Group name must have between 1 and " + GroupName.MAX_LENGTH + " characters.");
    }

    static InvalidGroupDetailsException exchangeDate() {
        return new InvalidGroupDetailsException(
                "exchange-date-not-in-future", "The Exchange Date must be a day after today.");
    }

    static InvalidGroupDetailsException budget() {
        return new InvalidGroupDetailsException(
                "invalid-budget", "The budget must be an amount from 0 to 999999.99, to the cent.");
    }

    static InvalidGroupDetailsException currency() {
        return new InvalidGroupDetailsException(
                "invalid-currency", "The Currency must be one of " + Arrays.toString(Currency.values()) + ".");
    }

    static InvalidGroupDetailsException timeZone() {
        return new InvalidGroupDetailsException(
                "invalid-time-zone", "The Time Zone must be an IANA time zone id, such as Europe/Madrid.");
    }
}
