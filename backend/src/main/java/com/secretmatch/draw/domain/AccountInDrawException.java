package com.secretmatch.draw.domain;

import com.secretmatch.shared.domain.DomainException;

/**
 * A User tried to delete their account while a Member of a Group whose Draw is made and whose Exchange Date has not
 * passed: the Draw would lose one of its Assignments.
 */
public class AccountInDrawException extends DomainException {

    public AccountInDrawException() {
        super(
                "account-in-draw",
                "You are in a Group whose Draw is made and whose Exchange Date has not passed. Ask its Admin to"
                        + " cancel the Draw, or wait until the Exchange Date has passed.");
    }
}
