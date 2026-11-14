# Wishlists are private to their owner and Giver

The Wishlist spec (#4) first made every Wishlist visible to every Member of the Group, before and after the Draw. While building #32 we made it private instead: a Wishlist is read by its owner at any time and, once the Group has a Draw, by the owner's Giver. Nobody else reads it, the Admin included. To anyone else the API answers `404 wishlist-not-found`, exactly as for a Wishlist that does not exist, so a refusal does not say who gives to whom. Only the owner ever changes it.

The Giver reaches it from their Receiver on the Group page ("Ver sus deseos"), and later from the Reveal (#30); the Members list links to no Wishlist but your own.

## Consequences

- Before the Draw nobody but the owner sees a Wishlist. Cancelling a Draw takes the Giver's access away with the Assignments.
- The Wishlist module reads a Giver's Receiver through a port of its own, `wishlist.application.Receivers`, backed by `draw.application.GroupDraw.findMyReceiver`. It never lists Assignments, keeping ADR 0001's rule that a Member only sees their own.
- Nothing records who read a Wishlist, as before.

## Accepted cost

Anonymity by deduction (ADR 0001) now applies to the Wishlist itself: since only the Giver can read it, knowing what a Wish says, or being seen reading "Deseos de Marta", points at Marta's Giver. A visible-to-all Wishlist would have hidden the Giver among every Member. We accept that cost for privacy: what a Member asks for is shared only with the person who needs it.

## Considered Options

- **Visible to every Member of the Group** (the original spec): camouflages the Giver and lets Members fill and read Wishlists before the Draw, but shares every Member's wishes with the whole Group. Going back to it would expose Wishlists their owners wrote expecting them to be private, so it needs those owners' consent, not just a code change.
