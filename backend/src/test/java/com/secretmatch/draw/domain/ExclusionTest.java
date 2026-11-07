package com.secretmatch.draw.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ExclusionTest {

    private static final MemberId ANA = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000001"));

    private static final MemberId BEA = new MemberId(UUID.fromString("00000000-0000-0000-0000-000000000002"));

    @Test
    @DisplayName("A–B and B–A are the same Exclusion")
    void isSymmetric() {
        assertThat(new Exclusion(BEA, ANA)).isEqualTo(new Exclusion(ANA, BEA));
    }

    @Test
    @DisplayName("a Member cannot be excluded from themselves")
    void needsTwoDifferentMembers() {
        assertThatThrownBy(() -> new Exclusion(ANA, ANA)).isInstanceOf(IllegalArgumentException.class);
    }
}
