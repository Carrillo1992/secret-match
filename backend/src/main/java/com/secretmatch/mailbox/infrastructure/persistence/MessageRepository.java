package com.secretmatch.mailbox.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

    @Query("SELECT m FROM MessageEntity m WHERE m.mailboxId = :mailboxId ORDER BY m.sentAt, m.id")
    List<MessageEntity> findIn(UUID mailboxId);
}
