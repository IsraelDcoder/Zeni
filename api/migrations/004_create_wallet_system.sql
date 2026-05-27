-- Migration: Create Wallet System
-- Date: 2026-05-27
-- Purpose: Track user savings, wallet balances, and transaction ledger

-- Wallet Table: Track user savings account
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(19, 2) NOT NULL DEFAULT 0.00, -- Current savings balance
  currency text NOT NULL DEFAULT 'NGN',
  total_saved numeric(19, 2) NOT NULL DEFAULT 0.00, -- Lifetime total
  total_withdrawn numeric(19, 2) NOT NULL DEFAULT 0.00,
  locked_balance numeric(19, 2) NOT NULL DEFAULT 0.00, -- Locked savings goals
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Wallet Transaction Ledger: Track all deposits/withdrawals
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(19, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'interest')),
  source text NOT NULL, -- 'manual_save', 'auto_save', 'round_up', 'interest', 'admin'
  description text,
  reference_id text, -- Link to savings goal, transaction, or payment
  related_transaction_id uuid, -- Link to bank transaction
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Bank Transactions: Track synced bank transactions for categorization
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_bank_id uuid NOT NULL REFERENCES connected_banks(id) ON DELETE CASCADE,
  bank_transaction_id text NOT NULL, -- External ID from Mono/Okra
  amount numeric(19, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('debit', 'credit', 'transfer')),
  direction text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  merchant text,
  merchant_id text,
  description text NOT NULL,
  category text, -- Will be filled by AI categorization
  confidence numeric(3, 2), -- AI confidence score (0-1)
  is_recurring boolean DEFAULT false,
  transaction_date timestamp with time zone NOT NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(connected_bank_id, bank_transaction_id) -- Prevent duplicates
);

-- Savings Goals: Track user savings targets
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_amount numeric(19, 2) NOT NULL,
  current_amount numeric(19, 2) NOT NULL DEFAULT 0.00,
  target_date date,
  category text, -- 'emergency_fund', 'vacation', 'education', 'investment', etc.
  is_locked boolean NOT NULL DEFAULT false, -- Can't withdraw until goal
  color text, -- For UI
  icon text, -- For UI
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_bank_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX idx_bank_transactions_connected_bank_id ON bank_transactions(connected_bank_id);
CREATE INDEX idx_bank_transactions_transaction_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_category ON bank_transactions(category);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_status ON savings_goals(status);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Wallets
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for Wallet Transactions
CREATE POLICY "Users can view their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert wallet transactions (via API)"
  ON wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Bank Transactions
CREATE POLICY "Users can view their own bank transactions"
  ON bank_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert bank transactions (via API)"
  ON bank_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Savings Goals
CREATE POLICY "Users can view their own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update triggers
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bank_transactions_updated_at BEFORE UPDATE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
