package com.secretmatch.mailbox.infrastructure;

import com.secretmatch.identity.application.UserDirectory;
import com.secretmatch.mailbox.application.MemberEmails;
import com.secretmatch.mailbox.domain.MemberId;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Reads a Member's email address through the Identity module's application API: a Member id is a User id. */
@Component
class UserDirectoryMemberEmails implements MemberEmails {

    private final UserDirectory users;

    UserDirectoryMemberEmails(UserDirectory users) {
        this.users = users;
    }

    @Override
    public Optional<String> emailOf(MemberId member) {
        return users.emailOf(member.value());
    }
}
