-- group: each Group's Currency, the money its budget and its Wish prices are in (ticket #93). Groups made before it
-- were all in euros, so the default backfills them; the application always sets it.
ALTER TABLE groups ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD'));
