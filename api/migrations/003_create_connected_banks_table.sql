-- Migration: Create Connected Banks Table
-- Date: 2026-05-27
-- Purpose: Store user bank connections via Mono/Okra Open Banking APIs

CREATE TABLE IF NOT EXISTS connected_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  account_type text NOT NULL DEFAULT 'current' CHECK (account_type IN ('savings', 'current')),
  provider text NOT NULL CHECK (provider IN ('mono', 'okra')),
  access_token text NOT NULL, -- Encrypted in production
  mono_customer_id text,
  okra_customer_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_connected_banks_user_id ON connected_banks(user_id);
CREATE INDEX idx_connected_banks_provider ON connected_banks(provider);
CREATE INDEX idx_connected_banks_is_active ON connected_banks(is_active);

-- Enable RLS
ALTER TABLE connected_banks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connected banks"
  ON connected_banks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert connected banks"
  ON connected_banks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected banks"
  ON connected_banks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected banks"
  ON connected_banks FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE TRIGGER connected_banks_updated_at BEFORE UPDATE ON connected_banks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Add columns to transactions table for bank sync ──────────────────

-- First check if columns exist before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE transactions ADD COLUMN external_reference text;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN bank_id uuid REFERENCES connected_banks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for transaction syncing
CREATE INDEX IF NOT EXISTS idx_transactions_external_reference ON transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_bank ON transactions(user_id, bank_id);
