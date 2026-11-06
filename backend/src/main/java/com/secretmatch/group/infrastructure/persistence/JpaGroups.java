package com.secretmatch.group.infrastructure.persistence;

import com.secretmatch.group.application.Groups;
import com.secretmatch.group.domain.Group;
import com.secretmatch.group.domain.GroupId;
import com.secretmatch.group.domain.MemberId;
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
}
