package com.secretmatch.mailbox.domain;

/**
 * What a Message says: text only, kept exactly as written, with at least one visible character and at most
 * {@value #MAX_LENGTH} characters (counted as people see them, so an emoji is one).
 */
public record MessageText(String value) {

    public static final int MAX_LENGTH = 1000;

    public MessageText {
        if (value == null || value.isBlank() || value.codePointCount(0, value.length()) > MAX_LENGTH) {
            throw new InvalidMessageException();
        }
    }

    /** Never the text itself: a Message's text stays out of logs. */
    @Override
    public String toString() {
        return "MessageText[redacted]";
    }
}
