package com.secretmatch.wishlist.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

/**
 * One thing a Member would like to receive. Only the title is required; text is trimmed, blank optional text
 * counts as none, and the priority is medium unless said otherwise.
 *
 * @param link an http or https address, never another scheme, so it is safe to open
 * @param price approximately what it costs, in euros, to the cent
 */
public record Wish(String title, String link, BigDecimal price, String notes, Priority priority) {

    public static final int TITLE_MAX_LENGTH = 100;
    public static final int LINK_MAX_LENGTH = 2000;
    public static final int NOTES_MAX_LENGTH = 1000;

    /** The price must be below this: a million euros. */
    public static final BigDecimal PRICE_LIMIT = new BigDecimal("1000000");

    private static final Set<String> LINK_SCHEMES = Set.of("http", "https");

    public Wish {
        title = title == null ? "" : title.strip();
        if (title.isEmpty() || title.length() > TITLE_MAX_LENGTH) {
            throw InvalidWishException.title();
        }
        link = blankAsNone(link);
        if (link != null && !isSafeLink(link)) {
            throw InvalidWishException.link();
        }
        if (price != null) {
            if (price.signum() < 0
                    || price.compareTo(PRICE_LIMIT) >= 0
                    || price.stripTrailingZeros().scale() > 2) {
                throw InvalidWishException.price();
            }
            price = price.setScale(2, RoundingMode.UNNECESSARY);
        }
        notes = blankAsNone(notes);
        if (notes != null && notes.length() > NOTES_MAX_LENGTH) {
            throw InvalidWishException.notes();
        }
        priority = priority == null ? Priority.MEDIUM : priority;
    }

    private static String blankAsNone(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        return text.strip();
    }

    private static boolean isSafeLink(String link) {
        if (link.length() > LINK_MAX_LENGTH) {
            return false;
        }
        try {
            URI uri = new URI(link);
            return uri.getScheme() != null
                    && LINK_SCHEMES.contains(uri.getScheme().toLowerCase(Locale.ROOT))
                    && uri.getHost() != null;
        } catch (URISyntaxException e) {
            return false;
        }
    }
}
