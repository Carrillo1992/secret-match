package com.secretmatch.group.domain;

import java.time.ZoneId;

/**
 * The IANA time zone (e.g. {@code Europe/Madrid}) a Group's Mailbox Message dates are cut in. It is the Group's,
 * never the viewer's, and it is frozen once the Draw is made: if a Receiver could choose the zone, watching where
 * the date flips would tell them the hour a Message was sent (ADR 0001).
 */
public record TimeZone(ZoneId zone) {

    /**
     * @param id an IANA id, as the JDK's time-zone database knows it; offsets ({@code +05:00}) and abbreviations
     *     ({@code EST}) are not
     * @throws InvalidGroupDetailsException if it is not one
     */
    public TimeZone(String id) {
        this(parse(id));
    }

    public TimeZone {
        if (zone == null) {
            throw InvalidGroupDetailsException.timeZone();
        }
    }

    /** The IANA id. */
    public String id() {
        return zone.getId();
    }

    private static ZoneId parse(String id) {
        if (id == null || !ZoneId.getAvailableZoneIds().contains(id)) {
            throw InvalidGroupDetailsException.timeZone();
        }
        return ZoneId.of(id);
    }
}
