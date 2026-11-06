package com.secretmatch.identity.application;

import com.secretmatch.identity.domain.UserId;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What other modules may read about Users: only how they are shown to others. */
@Service
public class UserDirectory {

    private final Users users;

    UserDirectory(Users users) {
        this.users = users;
    }

    /** The display name of each of these Users, by User id; ids without a User are left out. */
    @Transactional(readOnly = true)
    public Map<UUID, String> displayNamesOf(Collection<UUID> userIds) {
        return users.findAllById(userIds.stream().map(UserId::new).toList()).stream()
                .collect(Collectors.toMap(
                        user -> user.id().value(), user -> user.displayName().value()));
    }
}
