package com.secretmatch.draw.infrastructure.persistence;

import com.secretmatch.draw.application.Draws;
import com.secretmatch.draw.domain.Assignment;
import com.secretmatch.draw.domain.MemberId;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaDraws implements Draws {

    private final DrawRepository repository;

    JpaDraws(DrawRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean existsIn(UUID groupId) {
        return repository.existsById(groupId);
    }

    @Override
    public boolean add(UUID groupId, Set<Assignment> assignments, Instant drawnAt) {
        if (repository.addDraw(groupId, drawnAt) == 0) {
            return false;
        }
        for (Assignment assignment : assignments) {
            repository.addAssignment(
                    groupId, assignment.giver().value(), assignment.receiver().value());
        }
        return true;
    }

    @Override
    public Optional<MemberId> receiverOf(UUID groupId, MemberId giver) {
        return repository.findReceiver(groupId, giver.value()).map(MemberId::new);
    }

    @Override
    public void removeIn(UUID groupId) {
        repository.removeAssignmentsIn(groupId);
        repository.removeDrawIn(groupId);
    }

    @Override
    public void removeAssignmentsOf(MemberId user) {
        repository.removeAssignmentsOf(user.value());
    }
}
