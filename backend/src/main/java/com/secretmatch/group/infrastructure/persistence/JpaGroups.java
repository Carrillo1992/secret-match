package com.secretmatch.group.infrastructure.persistence;

import com.secretmatch.group.application.Groups;
import com.secretmatch.group.domain.Budget;
import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.InviteCode;
import com.secretmatch.group.domain.MemberId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
class JpaGroups implements Groups {

    private final GroupRepository repository;

    JpaGroups(GroupRepository repository) {
        this.repository = repository;
    }

    @Override
    public void add(Group group) {
        repository.save(GroupEntity.newGroup(group));
    }

    @Override
    public Optional<Group> findById(GroupId id) {
        return repository.findById(id.value()).map(GroupEntity::toDomain);
    }

    @Override
    public List<Group> findWithMember(MemberId user) {
        return repository.findWithMember(user.value()).stream()
                .map(GroupEntity::toDomain)
                .toList();
    }

    @Override
    public Optional<Group> findByInviteCode(InviteCode code) {
        return repository.findByInviteCode(code.value()).map(GroupEntity::toDomain);
    }

    @Override
    public boolean addMember(GroupId group, MemberId user, Instant joinedAt) {
        return repository.addMember(group.value(), user.value(), joinedAt) == 1;
    }

    @Override
    public boolean removeMember(GroupId group, MemberId user) {
        return repository.removeMember(group.value(), user.value()) == 1;
    }

    @Override
    public void saveDetails(Group group) {
        int changed = repository.updateDetails(
                group.id().value(),
                group.name().value(),
                group.exchangeDate(),
                group.budget().map(Budget::euros).orElse(null));
        if (changed != 1) {
            throw new IllegalStateException("no stored Group to change");
        }
    }

    @Override
    public void lock(GroupId group) {
        repository.lock(group.value());
    }

    @Override
    public void delete(GroupId group) {
        if (repository.deleteGroup(group.value()) != 1) {
            throw new IllegalStateException("no stored Group to delete");
        }
    }

    @Override
    public void saveInviteCode(Group group) {
        if (repository.updateInviteCode(group.id().value(), group.inviteCode().value()) != 1) {
            throw new IllegalStateException("no stored Group to change");
        }
    }

    @Override
    public void saveDrawn(Group group) {
        if (!group.isDrawn() || repository.markDrawn(group.id().value()) != 1) {
            throw new IllegalStateException("no stored Group to mark drawn");
        }
    }
}
