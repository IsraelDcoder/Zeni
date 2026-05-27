-- Migration: Create Wallet and Savings Tables
-- Date: 2026-05-26

-- ─── Wallets Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'savings' CHECK (type IN ('savings', 'vault', 'emergency', 'goal')),
  name text NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  locked_until timestamp with time zone,
  currency_code text NOT NULL DEFAULT 'NGN',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_type ON wallets(type);
CREATE INDEX idx_wallets_is_locked ON wallets(is_locked);

-- ─── Wallet Transactions Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount bigint NOT NULL,
  description text,
  reference text, -- Links to transactions table or external reference
  bank_transaction_id text, -- For synced bank transactions
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference);

-- ─── Savings Goals Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  target_amount bigint NOT NULL,
  current_amount bigint NOT NULL DEFAULT 0,
  deadline timestamp with time zone NOT NULL,
  color text,
  is_locked boolean NOT NULL DEFAULT false,
  lock_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_wallet_id ON savings_goals(wallet_id);
CREATE INDEX idx_savings_goals_deadline ON savings_goals(deadline);
CREATE INDEX idx_savings_goals_is_locked ON savings_goals(is_locked);

-- ─── Savings Automations Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed', 'roundup', 'ai_safe_save')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  amount bigint,
  percentage numeric(5, 2),
  is_active boolean NOT NULL DEFAULT true,
  next_scheduled_date timestamp with time zone,
  last_executed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_savings_automations_user_id ON savings_automations(user_id);
CREATE INDEX idx_savings_automations_wallet_id ON savings_automations(wallet_id);
CREATE INDEX idx_savings_automations_type ON savings_automations(type);
CREATE INDEX idx_savings_automations_is_active ON savings_automations(is_active);
CREATE INDEX idx_savings_automations_next_scheduled ON savings_automations(next_scheduled_date);

-- ─── Enable RLS (Row Level Security) ───────────────────────────────────
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_automations ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ─────────────────────────────────────────────────────

-- Wallets RLS
CREATE POLICY "Users can view their own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Wallet Transactions RLS
CREATE POLICY "Users can view wallet transactions for their wallets"
  ON wallet_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert wallet transactions for their wallets"
  ON wallet_transactions FOR INSERT
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

-- Savings Goals RLS
CREATE POLICY "Users can view their own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Savings Automations RLS
CREATE POLICY "Users can view their own automations"
  ON savings_automations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create automations"
  ON savings_automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automations"
  ON savings_automations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automations"
  ON savings_automations FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Audit Trigger (Optional) ─────────────────────────────────────────
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER savings_automations_updated_at BEFORE UPDATE ON savings_automations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
