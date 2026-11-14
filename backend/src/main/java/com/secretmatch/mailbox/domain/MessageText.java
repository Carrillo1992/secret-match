package com.secretmatch.mailbox.domain;

import java.util.regex.Pattern;

/**
 * What a Message says: text only, kept exactly as written. It needs at least one visible character (whitespace,
 * no-break and zero-width spaces or a BOM alone do not count), has no control characters other than line breaks
 * and tabs, and has at most {@value #MAX_LENGTH} characters, counted in Unicode code points as the database counts
 * them (so an emoji such as 🎁 is one, but one made of several code points is several).
 */
public record MessageText(String value) {

    public static final int MAX_LENGTH = 1000;

    /** Whitespace, separators (no-break spaces…) and format characters (zero-width spaces, the BOM…). */
    private static final Pattern INVISIBLE = Pattern.compile("[\\s\\p{Z}\\p{Cf}]+");

    /** NUL and the other C0 controls, and DEL; line feed, carriage return and tab are allowed. */
    private static final Pattern CONTROL = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    public MessageText {
        if (value == null
                || INVISIBLE.matcher(value).replaceAll("").isEmpty()
                || CONTROL.matcher(value).find()
                || value.codePointCount(0, value.length()) > MAX_LENGTH) {
            throw new InvalidMessageException();
        }
    }

    /** Never the text itself: a Message's text stays out of logs. */
    @Override
    public String toString() {
        return "MessageText[redacted]";
    }
}
