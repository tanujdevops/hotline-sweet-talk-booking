-- Update pricing to meet NOWPayments minimum requirements and implement Option 3
-- Free Trial: $0 (0.5 min) - unchanged
-- Essential: $12.99 (4 min) - was $9.99 (3 min) 
-- Deluxe: $19.99 (7 min) - was $14.99 (7 min)

UPDATE plans 
SET price_cents = 1299
WHERE key = 'essential';

UPDATE plans 
SET price_cents = 1999
WHERE key = 'deluxe';

-- Free trial remains unchanged (0 cents)
-- Note: This ensures all paid tiers are above NOWPayments $10-15 minimum thresholds