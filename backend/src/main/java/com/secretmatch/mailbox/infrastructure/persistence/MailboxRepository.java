package com.secretmatch.mailbox.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface MailboxRepository extends JpaRepository<MailboxEntity, UUID> {

    /** The same Mailbox opened twice at once: the second waits for the first to commit, then adds nothing. */
    @Modifying
    @Query(value = """
            INSERT INTO mailboxes (id, group_id, giver_id, receiver_id) VALUES (:id, :groupId, :giverId, :receiverId)
            ON CONFLICT (group_id, giver_id, receiver_id) DO NOTHING
            """, nativeQuery = true)
    int addIfMissing(UUID id, UUID groupId, UUID giverId, UUID receiverId);

    Optional<MailboxEntity> findByGroupIdAndGiverIdAndReceiverId(UUID groupId, UUID giverId, UUID receiverId);

    /** Its Messages go along ({@code ON DELETE CASCADE}). */
    @Modifying
    @Query(value = "DELETE FROM mailboxes WHERE group_id = :groupId", nativeQuery = true)
    int removeAllIn(UUID groupId);

    /** Its Messages go along ({@code ON DELETE CASCADE}). */
    @Modifying
    @Query(value = "DELETE FROM mailboxes WHERE giver_id = :userId OR receiver_id = :userId", nativeQuery = true)
    int removeAllOf(UUID userId);
}
