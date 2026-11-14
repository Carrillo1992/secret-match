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

    Optional<UserEntity> findByGoogleSubject(String googleSubject);

    /**
     * Inserts the User unless the email or the Google account is taken. A clash is a normal outcome (two
     * sign-ups verified at once), so it must not surface as a constraint violation, whose message would carry
     * the email.
     *
     * @return the number of rows inserted: 0 or 1
     */
    @Modifying
    @Query(value = """
                    INSERT INTO users (id, email, display_name, password_hash, google_subject, created_at)
                    VALUES (:id, :email, :displayName, :passwordHash, :googleSubject, :createdAt)
                    ON CONFLICT DO NOTHING
                    """, nativeQuery = true)
    int insertUnlessTaken(
            UUID id, String email, String displayName, String passwordHash, String googleSubject, Instant createdAt);

    /** Their refresh tokens and Password Reset go with them ({@code ON DELETE CASCADE}). */
    @Modifying
    @Query(value = "DELETE FROM users WHERE id = :id", nativeQuery = true)
    int deleteUser(UUID id);
}
