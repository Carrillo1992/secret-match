package com.secretmatch.group.domain;

import com.secretmatch.shared.domain.NotFoundException;

/**
 * No Group has an Invite Link with this code: it was never one, or it was regenerated. The message is the
 * same in every case and says nothing about any Group.
 */
public class InviteLinkInvalidException extends NotFoundException {

    public InviteLinkInvalidException() {
        super("invite-link-invalid", "This Invite Link does not work.");
    }
}
