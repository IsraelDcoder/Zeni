-- Migration: 001_create_initial_schema.sql
-- Create initial Zeni database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  monthly_income DECIMAL(12, 2) DEFAULT 0,
  monthly_expense_target DECIMAL(12, 2) DEFAULT 0,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  spending_alerts_enabled BOOLEAN DEFAULT TRUE,
  weekly_reports_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction categories enum
CREATE TYPE transaction_category AS ENUM (
  'food',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'income',
  'education',
  'rent',
  'betting',
  'subscriptions',
  'transfers',
  'other'
);

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('expense', 'income');

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category transaction_category NOT NULL,
  type transaction_type NOT NULL,
  is_impulse BOOLEAN DEFAULT FALSE,
  hour INTEGER CHECK (hour >= 0 AND hour < 24),
  bank_transaction_id TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'bank')),
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category transaction_category NOT NULL,
  limit_amount DECIMAL(12, 2) NOT NULL CHECK (limit_amount > 0),
  period TEXT DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, period)
);

-- Savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank connections table
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  paystack_access_code TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insight types and severity enums
CREATE TYPE insight_type AS ENUM (
  'budget_alert',
  'spending_pattern',
  'anomaly_detection',
  'recommendation',
  'goal_progress'
);

CREATE TYPE severity_level AS ENUM (
  'info',
  'warning',
  'critical',
  'positive'
);

-- AI insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type insight_type NOT NULL,
  severity severity_level NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_items TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);

-- Transaction indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Budget indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category ON budgets(category);

-- Savings goal indexes
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);

-- Bank connection indexes
CREATE INDEX idx_bank_connections_user_id ON bank_connections(user_id);

-- Insight indexes
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_created ON ai_insights(generated_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Users policies - users can only see/update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Transactions policies - users can only access their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Budgets policies - users can only access their own budgets
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Savings goals policies - users can only access their own goals
CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Bank connections policies - users can only access their own connections
CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bank connections"
  ON bank_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank connections"
  ON bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- AI insights policies - users can only access their own insights
CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user spending this month
CREATE OR REPLACE FUNCTION get_monthly_spending(user_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE transactions.user_id = $1
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW());
$$ LANGUAGE SQL;

-- Function to get budget status for a user
CREATE OR REPLACE FUNCTION get_budget_status(user_id UUID)
RETURNS TABLE (
  category transaction_category,
  limit_amount DECIMAL,
  spent DECIMAL,
  percentage_used DECIMAL
) AS $$
  SELECT
    b.category,
    b.limit_amount,
    COALESCE(SUM(t.amount), 0) as spent,
    CASE
      WHEN b.limit_amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.limit_amount) * 100
      ELSE 0
    END as percentage_used
  FROM budgets b
  LEFT JOIN transactions t ON b.user_id = t.user_id
    AND b.category = t.category
    AND t.type = 'expense'
    AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', NOW())
  WHERE b.user_id = $1
  GROUP BY b.id, b.category, b.limit_amount
  ORDER BY b.category;
$$ LANGUAGE SQL;

-- Function to calculate financial score (0-100)
CREATE OR REPLACE FUNCTION calculate_financial_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50;
  budget_adherence DECIMAL;
  savings_progress DECIMAL;
  transaction_consistency INTEGER;
BEGIN
  -- Budget adherence factor (max +25)
  SELECT AVG(
    CASE
      WHEN b.limit_amount > 0 AND spent <= b.limit_amount THEN 25
      WHEN b.limit_amount > 0 AND spent > b.limit_amount THEN 25 * (1 - ((spent - b.limit_amount) / b.limit_amount))
      ELSE 0
    END
  ) INTO budget_adherence
  FROM (SELECT * FROM get_budget_status($1)) b;

  score := score + COALESCE(ROUND(budget_adherence), 0);

  -- Savings progress factor (max +15)
  SELECT COALESCE(AVG((current_amount / target_amount) * 15), 0)
  INTO savings_progress
  FROM savings_goals
  WHERE user_id = $1 AND target_amount > 0;

  score := score + COALESCE(ROUND(savings_progress), 0);

  -- Transaction consistency factor (max +10)
  SELECT COUNT(DISTINCT DATE(date))
  INTO transaction_consistency
  FROM transactions
  WHERE user_id = $1
    AND date >= NOW() - INTERVAL '30 days';

  IF transaction_consistency > 20 THEN
    score := score + 10;
  ELSIF transaction_consistency > 10 THEN
    score := score + 5;
  END IF;

  RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'Zeni user accounts and profile information';
COMMENT ON TABLE transactions IS 'User financial transactions (income/expenses)';
COMMENT ON TABLE budgets IS 'Category-based spending budgets';
COMMENT ON TABLE savings_goals IS 'User financial goals';
COMMENT ON TABLE bank_connections IS 'Connected bank accounts for transaction sync';
COMMENT ON TABLE ai_insights IS 'AI-generated financial insights and recommendations';

COMMENT ON COLUMN users.encrypted_password IS 'Password encrypted by Supabase Auth';
COMMENT ON COLUMN transactions.source IS 'Manual entry or synced from bank';
COMMENT ON COLUMN bank_connections.paystack_access_code IS 'Access code from Paystack Open Banking OAuth';
COMMENT ON COLUMN ai_insights.expires_at IS 'Insights auto-expire after this date';
