package com.secretmatch.draw.infrastructure.persistence;

import com.secretmatch.draw.application.StoredExclusion;
import com.secretmatch.draw.domain.Exclusion;
import com.secretmatch.draw.domain.MemberId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The {@code exclusions} table. Rows are written with native queries in {@link ExclusionRepository}. */
@Entity
@Table(name = "exclusions")
class ExclusionEntity {

    @Id
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "member_a", nullable = false)
    private UUID memberA;

    @Column(name = "member_b", nullable = false)
    private UUID memberB;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ExclusionEntity() {}

    StoredExclusion toStored() {
        return new StoredExclusion(id, new Exclusion(new MemberId(memberA), new MemberId(memberB)));
    }
}
