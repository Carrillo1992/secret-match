package com.secretmatch.identity.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface UserRepository extends JpaRepository<UserEntity, UUID> {

    boolean existsByEmail(String email);

    Optional<UserEntity> findByEmail(String email);

    /**
     * Inserts the User unless the email is taken. A clash is a normal outcome (two sign-ups verified at
     * once), so it must not surface as a constraint violation, whose message would carry the email.
     *
     * @return the number of rows inserted: 0 or 1
     */
    @Modifying
    @Query(value = """
                    INSERT INTO users (id, email, display_name, password_hash, created_at)
                    VALUES (:id, :email, :displayName, :passwordHash, :createdAt)
                    ON CONFLICT (email) DO NOTHING
                    """, nativeQuery = true)
    int insertIfEmailFree(UUID id, String email, String displayName, String passwordHash, Instant createdAt);
}
