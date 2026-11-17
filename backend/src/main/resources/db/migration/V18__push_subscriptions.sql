-- notification: where to push to each device a User turned notifications on for (ticket #119).
-- An endpoint is one browser on one device, so it belongs to one User at a time: subscribing it again from another
-- User moves it. The text is written when it is sent, in the User's Language at that moment, so none is kept here.
CREATE TABLE push_subscriptions (
    id         UUID          PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint   VARCHAR(1000) NOT NULL UNIQUE,
    -- The browser's P-256 public key and authentication secret, base64url, as the Push API hands them over.
    p256dh     VARCHAR(100)  NOT NULL,
    auth       VARCHAR(50)   NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL
);

CREATE INDEX push_subscriptions_user_id ON push_subscriptions (user_id);
