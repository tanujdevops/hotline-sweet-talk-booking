-- Update pricing to meet PayGate.to minimum requirements
-- Essential: $2.49 -> $5.99 (599 cents)
-- Deluxe: $4.99 -> $9.99 (999 cents)

UPDATE plans 
SET price_cents = 599
WHERE key = 'standard';

UPDATE plans 
SET price_cents = 999
WHERE key = 'extended';

-- Free trial remains unchanged (0 cents)