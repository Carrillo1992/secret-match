package com.secretmatch.group.domain;

/** What a Group is called, trimmed. */
public record GroupName(String value) {

    public static final int MAX_LENGTH = 80;

    public GroupName {
        value = value == null ? "" : value.strip();
        if (value.isEmpty() || value.length() > MAX_LENGTH) {
            throw InvalidGroupDetailsException.name();
        }
    }
}
