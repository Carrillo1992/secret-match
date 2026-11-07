# SecretMatch

Secret Santa / gift exchanges for families and groups of friends: people join a group, a draw secretly assigns each of them someone to give a gift to, and nobody ever learns who is giving to them.

## Language

### Groups

**User**:
A person's account in SecretMatch, identified by their email and shown to others by their display name. They sign in with a password, a Google Link, or both. One User can be a Member of many Groups.
_Avoid_: Account holder, player

**Display Name**:
How a User is shown to the other Members of their Groups. Chosen at sign-up and changeable from their Profile; not unique.
_Avoid_: Username, nickname, alias

**Sign-up Verification**:
A password sign-up waiting for its owner to open the link emailed to them. The link is single-use and expires after 24 hours; opening it creates the User with that sign-up's details. Several may wait for the same email, and the first one opened wins.
_Avoid_: Pending user, unverified account, activation

**Verification Link**:
The link in the email that verifies a Sign-up Verification. Asking for a new one replaces it: only the latest link of a sign-up works.
_Avoid_: Activation link, confirmation code, magic link

**Session**:
A User being signed in on one device. It starts when they sign in with their email and password or with Google, survives page reloads, and ends when they sign out, after 30 days without use, or as soon as a stolen copy of it is detected. Signing out ends only that Session, not the User's others; changing or setting the password ends all the others, keeping only the one it was done from.
_Avoid_: Login, connection

**Google Link**:
The tie between a User and one Google account, made the first time they continue with Google. A new email gets a new User named as in Google; an email that already has a User is linked to it. It remembers the Google account itself, not its email, so a later change of Google email keeps the same User, and another Google account cannot take over a User already linked.
_Avoid_: Google login, social account, OAuth connection

**Profile**:
What a User manages about their own account: their Display Name and their password. Not what they tell their Giver: that is their Preferences.
_Avoid_: Account settings, my account

**Group**:
A single gift exchange: a set of Members who take part in one Draw. Next year's exchange is a new Group.
_Avoid_: Exchange, event, room, edition

**Member**:
A User inside a specific Group. Every Member takes part in the Draw.
_Avoid_: Participant, player, santa

**Admin**:
The Member who created a Group and manages it: edits its name, Exchange Date and Budget, invites, removes Members, sets Exclusions, runs or cancels the Draw. Exactly one per Group; the Admin is also a regular Member of the Draw.
_Avoid_: Organizer, owner, host

**Exchange Date**:
The day the gifts are handed over in a Group.
_Avoid_: Event date, deadline, party date

**Finished**:
A Group whose Exchange Date is over: from 00:00 Europe/Madrid on the day after it. A finished Group is read-only (nobody joins, leaves, is removed or edits it, and its Invite Link cannot be regenerated); only its deletion is still allowed. Shown as "Finalizado".
_Avoid_: Closed, archived, expired, past

**Budget**:
How much each gift in a Group should cost, in euros. Optional and informational only: nothing is ever checked against it.
_Avoid_: Price limit, spending cap, max price

**Invite Link**:
The single shareable link through which Users join a Group. Regenerating it invalidates the previous one, and it stops working once the Draw is made. Its random, unguessable part is the Invite Link's code (`InviteCode` in code); joining through it makes the User a Member (a membership).
_Avoid_: Invitation code, join code, invitation

### Draw

**Draw**:
The act, triggered by the Admin once everyone has joined, of secretly assigning every Member of a Group someone to give a gift to, and the set of Assignments it produces. Every Member, the Admin included, takes part. Cancelling a Draw discards all its Assignments and reopens the Group.
_Avoid_: Raffle, match, shuffle, pairing

**Assignment**:
The directed pair Giver → Receiver produced by a Draw. Each member is the Giver of exactly one Assignment and the Receiver of exactly one, never their own, and never in both directions with the same person.
_Avoid_: Match, pairing, couple

**Giver**:
The member who gives a gift in an Assignment. A Giver knows only their own Receiver.
_Avoid_: Santa, sender, buyer

**Receiver**:
The member who receives a gift in an Assignment. A Receiver must never learn who their Giver is.
_Avoid_: Recipient, giftee, target

**Exclusion**:
A rule set by the group admin that two specific members may never be assigned to each other, in either direction.
_Avoid_: Restriction, block, constraint

**Reveal**:
The moment a Giver discovers who their Receiver is, available to each Giver as soon as the Draw is made. Givers are never revealed to Receivers.
_Avoid_: Unveiling, unmasking, opening

### Wishlist

**Wishlist**:
What a Member would like to receive in a specific Group: their Wishes, Preferences and Don't List. Visible to every Member of that Group.
_Avoid_: Gift list, registry, letter

**Wish**:
One thing a Member would like to receive, with a priority of high, medium or low.
_Avoid_: Item, gift idea, product

**Preferences**:
A Member's free-text description of their tastes, sizes and hobbies, to guide a Giver beyond the Wishes.
_Avoid_: Profile, likes, about me

**Don't List**:
A Member's short entries describing what they do not want to receive ("no chocolate", "no candles").
_Avoid_: Blacklist, avoid list, no-go list, please-don't list

### Mailbox

**Mailbox**:
The anonymous conversation belonging to one Assignment, between a Giver and their Receiver. The Receiver only ever sees "your Giver"; nobody else can read it.
_Avoid_: Chat, inbox, thread

**Message**:
One text entry in a Mailbox, written by either the Giver or the Receiver.
_Avoid_: Question, note, comment
