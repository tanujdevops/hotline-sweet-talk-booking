-- Add XaiGate columns to bookings table for crypto payment support
-- This is a non-breaking change - old Stripe columns remain intact

-- Add XaiGate payment tracking columns
ALTER TABLE bookings 
  ADD COLUMN xaigate_invoice_id TEXT,
  ADD COLUMN crypto_amount DECIMAL(10,2),
  ADD COLUMN crypto_currency TEXT CHECK (crypto_currency IN ('USDT', 'USDC')),
  ADD COLUMN crypto_network TEXT CHECK (crypto_network IN ('BEP20', 'TRC20')),
  ADD COLUMN crypto_transaction_hash TEXT,
  ADD COLUMN crypto_payment_data JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_xaigate_invoice ON bookings(xaigate_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_crypto_hash ON bookings(crypto_transaction_hash);

-- Add comments for documentation
COMMENT ON COLUMN bookings.xaigate_invoice_id IS 'XaiGate invoice ID for crypto payments';
COMMENT ON COLUMN bookings.crypto_amount IS 'Amount paid in cryptocurrency (USDT/USDC)';
COMMENT ON COLUMN bookings.crypto_currency IS 'Cryptocurrency used (USDT or USDC)';
COMMENT ON COLUMN bookings.crypto_network IS 'Blockchain network (BEP20 or TRC20)';
COMMENT ON COLUMN bookings.crypto_transaction_hash IS 'Blockchain transaction hash for payment confirmation';
COMMENT ON COLUMN bookings.crypto_payment_data IS 'Full XaiGate payment data for reference';