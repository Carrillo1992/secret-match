package com.secretmatch.group.domain;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The random, unguessable code in a Group's Invite Link. Whoever holds it can join the Group, so it is never
 * logged.
 */
public record InviteCode(String value) {

    private static final int BYTES = 16;
    private static final Pattern SHAPE = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    /** A code known to be well formed, such as a stored one. */
    public InviteCode {
        if (!hasShape(value)) {
            throw new IllegalArgumentException("not an Invite Link code");
        }
    }

    /** A new code of 128 random bits. */
    public static InviteCode generate(SecureRandom random) {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return new InviteCode(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    /**
     * The code as it came in a link, if it has the shape of one. A code of another shape cannot belong to any
     * Group.
     */
    public static Optional<InviteCode> parse(String value) {
        return hasShape(value) ? Optional.of(new InviteCode(value)) : Optional.empty();
    }

    @Override
    public String toString() {
        return "InviteCode[redacted]";
    }

    private static boolean hasShape(String value) {
        return value != null && SHAPE.matcher(value).matches();
    }
}
