package com.secretmatch.group.infrastructure.persistence;

import com.secretmatch.group.domain.Budget;
import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.GroupName;
import com.secretmatch.group.domain.InviteCode;
import com.secretmatch.group.domain.MemberId;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** The {@code groups} table, with its Members in {@code group_members}. */
@Entity
@Table(name = "groups")
class GroupEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "exchange_date", nullable = false)
    private LocalDate exchangeDate;

    @Column(precision = 8, scale = 2)
    private BigDecimal budget;

    @Column(name = "admin_id", nullable = false)
    private UUID adminId;

    @Column(name = "invite_code", nullable = false)
    private String inviteCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @ElementCollection
    @CollectionTable(name = "group_members", joinColumns = @JoinColumn(name = "group_id"))
    @OrderBy("joinedAt, userId")
    private List<MemberEmbeddable> members = new ArrayList<>();

    protected GroupEntity() {}

    /** A new Group's row: every Member joined when it was created. */
    static GroupEntity newGroup(Group group) {
        GroupEntity entity = new GroupEntity();
        entity.id = group.id().value();
        entity.name = group.name().value();
        entity.exchangeDate = group.exchangeDate();
        entity.budget = group.budget().map(Budget::euros).orElse(null);
        entity.adminId = group.admin().value();
        entity.inviteCode = group.inviteCode().value();
        entity.createdAt = group.createdAt();
        group.members().forEach(member -> entity.members.add(new MemberEmbeddable(member.value(), group.createdAt())));
        return entity;
    }

    Group toDomain() {
        return new Group(
                new GroupId(id),
                new GroupName(name),
                exchangeDate,
                budget == null ? null : new Budget(budget),
                new MemberId(adminId),
                members.stream().map(member -> new MemberId(member.userId)).toList(),
                InviteCode.of(inviteCode),
                createdAt);
    }

    @Embeddable
    static class MemberEmbeddable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "joined_at", nullable = false)
        private Instant joinedAt;

        protected MemberEmbeddable() {}

        MemberEmbeddable(UUID userId, Instant joinedAt) {
            this.userId = userId;
            this.joinedAt = joinedAt;
        }
    }
}
