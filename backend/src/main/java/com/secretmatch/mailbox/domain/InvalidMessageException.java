package com.secretmatch.mailbox.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Message that is empty, blank or too long. The message never repeats the text. */
public class InvalidMessageException extends DomainException {

    public InvalidMessageException() {
        super("invalid-message", "A Message needs text of 1 to " + MessageText.MAX_LENGTH + " characters.");
    }
}
