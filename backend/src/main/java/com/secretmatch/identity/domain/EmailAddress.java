package com.secretmatch.identity.domain;

import java.util.Locale;
import java.util.regex.Pattern;

/** The email that identifies a User, trimmed and in lower case so one inbox is one User. */
public record EmailAddress(String value) {

    public static final int MAX_LENGTH = 254;

    /** Something before an {@code @}, and a domain with a dot after it. */
    public static final String SHAPE = "\\s*[^@\\s]+@[^@\\s]+\\.[^@\\s]+\\s*";

    private static final Pattern SHAPE_PATTERN = Pattern.compile(SHAPE);

    public EmailAddress {
        value = value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
        if (value.length() > MAX_LENGTH || !SHAPE_PATTERN.matcher(value).matches()) {
            throw InvalidUserDetailsException.email();
        }
    }

    /** Leaves out the address: it is personal data and must not reach logs. */
    @Override
    public String toString() {
        return "EmailAddress[redacted]";
    }
}
