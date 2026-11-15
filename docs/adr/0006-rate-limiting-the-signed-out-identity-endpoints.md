# Rate limiting the signed-out identity endpoints

Until #97 nothing limited the endpoints a signed-out visitor can call. Anyone could flood an inbox with reset or verification links, use up the Resend quota (and with it every email of the app, the Group and Draw emails included), or burn CPU for free, since sign-up, sign-in and setting a new password each run BCrypt on every call.

## Decision

**In-memory Bucket4j.** One bucket per key, kept in a Caffeine cache that forgets a bucket once it has gone unused for its whole period (by then it would be full again). The app runs as one instance, and losing the counts on a restart is acceptable. Bucket4j and Caffeine both read the application's `Clock`, so tests move time by hand. The code is in `identity.infrastructure.ratelimit`; every limit is a property under `secretmatch.rate-limit` (defaults in `application.yml`, each overridable through an environment variable).

**Per client IP: a loud `429`.** A Spring MVC interceptor counts the POSTs of each client IP to `sign-ups`, `sign-ups/{id}/verification-emails`, `verification-emails`, `password-reset-emails`, `password-resets` and `sessions`. Over the limit it answers `429 Too Many Requests` with `Retry-After` and a `ProblemDetail` of type `urn:secretmatch:problem:too-many-requests`, before the body is read. The answer is the same whatever the request carried, so it says nothing about any email. The IP is not personal to any account, which is why it can be loud: the SPA tells the visitor to wait.

| Per IP | Default |
|---|---|
| Sign-up | 5 per hour |
| Reset link and new verification link, together | 10 per hour |
| Sign-in | 10 per minute |
| Setting a new password | 10 per 15 minutes |

**Per email: silent.** Sign-up, a new verification link and a reset link are each counted per normalized `EmailAddress` (3 per hour by default), whether or not the email has a User or a sign-up. This sits in the use cases (`EmailSignUp`, `PasswordResetting`) behind the `identity.application.LinkEmailLimits` port. Over the limit the request answers exactly as before (same status, same body), but nothing is saved and nothing is sent. A `429` here would tell an attacker that someone asked for that email recently, and it would make "email with a User" and "email without one" behave differently. An attacker who rotates IPs can still reach any one inbox only a few times an hour.

**The client IP behind the Heroku router** (since #108, replacing the Render setup below). The API runs on Heroku and its DNS record is not proxied by Cloudflare, so the Heroku router is the only proxy. Heroku documents that when a request already carries `X-Forwarded-For`, the router appends the address it got the connection from to the right of the list. So `trusted-proxies` is `1` in `prod` and the client is the rightmost entry. A client that calls the `*.herokuapp.com` address directly still goes through the router, so the Render bypass described under Consequences does not apply on Heroku.

**The client IP behind Render** (superseded). Render's proxy does not strip an `X-Forwarded-For` the client sent: it appends to it. Cloudflare, in front of Render, appends the address it got the request from (the real client), then Render's proxy appends Cloudflare's. So `secretmatch.rate-limit.trusted-proxies` is `2` in `prod`, and the client is the second entry from the right. Anything further left was written by the client and is ignored. With fewer entries than trusted proxies, the remote address counts. Locally it is `0`, and the remote address is the client. The Render behaviour comes from community reports, not from Render's documentation. If Render or Cloudflare change the chain, only this number changes.

**A daily cap on Verification and Password Reset emails.** These emails together have a cap of 50 per UTC calendar day by default, set below the Resend free quota. Over the cap they are silently not sent, and one warning without personal data is logged per day. Only these emails count, because anyone can trigger them without an account. Group, Draw and Mailbox emails go to Members who chose to join a Group, so they are never counted and never blocked: a burst of sign-ups cannot silence a Draw.

**No personal data in logs.** Neither an email nor an IP is ever logged. Keys stay in memory only.

## Consequences

- Counts reset when the app restarts, and a second instance would get its own counts. Moving to several instances means shared counters (Postgres or Redis, through Bucket4j's proxy managers) and a new decision.
- The IP rule holds only for traffic that comes through Cloudflare. A client that calls the service's `*.onrender.com` address directly skips Cloudflare: the second entry from the right is then one it wrote itself, and it can change it to get a fresh limit. The per-email limits and the daily cap still apply. Closing this needs the origin to accept only Cloudflare's traffic, which is host configuration, not code.
- People behind one NAT (an office, a family) share an IP limit. The limits are generous enough for a group signing up together.
- Over the daily cap, a real User who forgot their password gets no email until the next UTC day, without being told. The cap is a guard against abuse, not something normal use should reach.
- Over a per-email limit, a User who keeps asking for a link gets no new one for up to an hour. The links already sent keep working.

## Considered Options

- **A `429` per email too**: simpler to explain to the visitor, but it leaks that an email was asked for recently and treats emails with and without a User differently. Rejected for the anonymity of accounts.
- **Shared or persistent counters (Postgres, Redis)**: needed only with several instances. Out of scope in #97.
- **CAPTCHA or account lockout**: more friction for real Users, and a lockout lets anyone lock someone else out. Out of scope in #97.
- **Trusting the leftmost `X-Forwarded-For` entry, or Tomcat's `RemoteIpValve`**: the leftmost entry is whatever the client sent. The valve picks the rightmost address that is not a private one, which here is Cloudflare's edge, so every client would share one limit.
- **`CF-Connecting-IP`**: also works behind Cloudflare, but it ties the app to Cloudflare by name, and the ticket asked for the entry the proxy appends.
