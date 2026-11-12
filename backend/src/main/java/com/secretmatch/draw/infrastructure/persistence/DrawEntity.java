package com.secretmatch.draw.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The {@code draws} table. Its rows, and those of {@code assignments}, are written with native queries in
 * {@link DrawRepository}.
 */
@Entity
@Table(name = "draws")
class DrawEntity {

    @Id
    @Column(name = "group_id")
    private UUID groupId;

    @Column(name = "drawn_at", nullable = false)
    private Instant drawnAt;

    protected DrawEntity() {}
}
