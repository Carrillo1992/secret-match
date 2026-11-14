# Anonymity by deduction shapes the Draw

A Receiver must never learn who their Giver is, and hiding the data is not enough: a Receiver can *deduce* their Giver from what they legitimately know (who they give to, group size, Exclusions). With 3 Members there are only two valid Draws (both 3-cycles), so knowing your own Receiver identifies your Giver; reciprocal pairs and visible Exclusions shrink the candidate set the same way. We therefore accept usability costs to keep at least two plausible Givers for every Receiver.

## Rules

- A Draw needs at least 4 Members.
- A Draw never contains reciprocal Assignments (A→B and B→A). This is a fixed engine rule, not a group setting.
- Exclusions are symmetric, managed and visible only by the admin. Members cannot see or propose them.
- Nobody, the admin (who also takes part) and API operators included, can list a Draw's Assignments. A Member only sees their own Receiver.
- When no valid Draw exists, the error is generic: it does not say which Exclusion makes it impossible.
- The random seed is never persisted or logged.
- Mailbox Messages show only their date (no time), with no presence, typing or read indicators. Mailbox emails carry neither the Message text nor anything about the sender.
- That date is cut server-side in the Group's Time Zone, the same for both sides of a Mailbox, never in a zone the viewer chooses. The Time Zone is frozen once the Draw is made: if a Receiver could ask for their Messages in many zones (a request parameter, a profile setting, or the Admin changing the Group's zone), watching where a date flips would narrow the hour a Message was sent to about 15 minutes.
- After a Draw, membership, Exclusions and the Group's Time Zone are frozen. There is no partial re-assignment; the only remedy is cancelling the whole Draw and drawing again.

## Considered Options

- **Visible Exclusions / Members proposing their own**: friendlier, but each visible Exclusion removes a Giver candidate.
- **Partial re-draw when someone joins or leaves**: avoids a full re-draw, but whoever gets a new Receiver learns something changed, and others can infer who was affected.
- **Single-cycle Draw** (A→B→…→A): nicer for a chained reveal, but rejects many groups that have valid Draws.
- **Message dates in each viewer's own time zone**: friendlier near midnight, but a zone the caller controls lets them probe it repeatedly and recover the hour a Message was sent.
