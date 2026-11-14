package com.secretmatch.wishlist.domain;

/**
 * One short thing a Member does not want to receive, on their Don't List ("nada de chocolate"). The text is
 * trimmed and cannot be empty.
 *
 * @param text 1 to {@value #MAX_LENGTH} characters
 */
public record DontListEntry(String text) {

    public static final int MAX_LENGTH = 100;

    public DontListEntry {
        text = text == null ? "" : text.strip();
        if (text.isEmpty() || text.length() > MAX_LENGTH) {
            throw new InvalidDontListEntryException();
        }
    }
}
