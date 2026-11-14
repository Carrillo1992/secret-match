package com.secretmatch.wishlist.domain;

/**
 * A Member's free-text description of their tastes, sizes and hobbies, to guide their Giver beyond the Wishes. The
 * text is trimmed, and blank text means the Member wrote none ({@link #NONE}).
 *
 * @param text up to {@value #MAX_LENGTH} characters, or {@code null} for none
 */
public record Preferences(String text) {

    public static final int MAX_LENGTH = 2000;

    /** No Preferences written. */
    public static final Preferences NONE = new Preferences(null);

    public Preferences {
        text = text == null || text.isBlank() ? null : text.strip();
        if (text != null && text.length() > MAX_LENGTH) {
            throw new InvalidPreferencesException();
        }
    }
}
