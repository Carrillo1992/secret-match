package com.secretmatch.mailbox.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Message that is empty, blank, too long or has control characters. The message never repeats the text. */
public class InvalidMessageException extends DomainException {

    public InvalidMessageException() {
        super(
                "invalid-message",
                "A Message needs visible text of up to " + MessageText.MAX_LENGTH
                        + " characters, with no control characters other than line breaks and tabs.");
    }
}
