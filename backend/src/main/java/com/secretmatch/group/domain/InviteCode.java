package com.secretmatch.group.domain;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The random, unguessable part of a Group's Invite Link. Whoever holds it can join the Group, so it is never
 * logged.
 */
public final class InviteCode {

    private static final int BYTES = 16;
    private static final Pattern SHAPE = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    private final String value;

    private InviteCode(String value) {
        this.value = value;
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
        return value != null && SHAPE.matcher(value).matches() ? Optional.of(new InviteCode(value)) : Optional.empty();
    }

    /** A code known to be well formed, such as a stored one. */
    public static InviteCode of(String value) {
        return parse(value).orElseThrow(() -> new IllegalArgumentException("not an Invite Link code"));
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof InviteCode code && code.value.equals(value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return "InviteCode[redacted]";
    }
}
