package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Group name, Exchange Date or budget that breaks its rules. */
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
                "invalid-budget", "The budget must be an amount in euros from 0 to 999999.99, to the cent.");
    }
}
