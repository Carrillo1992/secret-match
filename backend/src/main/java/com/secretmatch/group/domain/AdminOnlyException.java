package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.DomainException;

/** A Member who is not the Admin tried something only the Admin of the Group may do. */
public class AdminOnlyException extends DomainException {

    public AdminOnlyException() {
        super("admin-only", "Only the Admin of the Group can do this.");
    }
}
