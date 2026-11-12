package com.secretmatch.draw.application;

import java.util.Objects;
import java.util.UUID;

/**
 * The Receiver of the Member asking: the only Assignment anyone ever sees (ADR 0001).
 *
 * @param id the id of the User the Receiver is
 */
public record MyReceiver(UUID id, String displayName) {

    public MyReceiver {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(displayName, "displayName");
    }
}
