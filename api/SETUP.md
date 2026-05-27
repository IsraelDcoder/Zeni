# Zeni Backend Setup Guide

## Step 1: Get Your Supabase API Keys

Your project reference is: **bnlwqnqzjwktiiqufljp**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your Zeni project
3. Navigate to **Settings > API** (left sidebar)
4. Copy these values:
   - **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY` in `.env`
   - **`anon` key** → `SUPABASE_ANON_KEY` in `.env`

## Step 2: Run Database Migrations

### Option A: Via Supabase SQL Editor (Easiest for First Time)

1. Go to Supabase Dashboard > **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `migrations/001_create_initial_schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** button
6. Verify all tables are created (you'll see output messages)

### Option B: Via psql CLI (If you have PostgreSQL installed)

```bash
psql "postgresql://postgres.bnlwqnqzjwktiiqufljp:Zenimyfintech@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f migrations/001_create_initial_schema.sql
```

### Option C: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref bnlwqnqzjwktiiqufljp

# Run migrations
supabase db push
```

## Step 3: Update Your .env File

Edit `api/.env` and fill in these values:

```env
SUPABASE_URL=https://bnlwqnqzjwktiiqufljp.supabase.co
SUPABASE_ANON_KEY=<paste from dashboard>
SUPABASE_SERVICE_ROLE_KEY=<paste from dashboard>
```

## Step 4: Enable Supabase Auth

1. Go to Supabase Dashboard > **Authentication > Providers**
2. Ensure **Email** provider is enabled (it should be by default)
3. Go to **Settings > Auth** and note the JWT Secret (for reference)

## Step 5: Set Up Row-Level Security (RLS)

The migration file includes all RLS policies. They're automatically enabled in the schema.

**What this means:**
- Users can only see/modify their own data
- No user can access another user's transactions, budgets, or goals
- Bank connections are private
- This is enforced at the database level (secure!)

## Step 6: Create Test Data (Optional)

Run this in Supabase SQL Editor to create a test user:

```sql
-- Create test user (email: test@zeni.com, password: test123456)
INSERT INTO users (id, email, first_name, last_name, monthly_income, monthly_expense_target)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test@zeni.com',
  'Test',
  'User',
  50000,
  30000
);

-- Create test transactions
INSERT INTO transactions (user_id, amount, description, category, type, date)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 2500, 'Lunch at restaurant', 'food'::transaction_category, 'expense'::transaction_type, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 5000, 'Fuel', 'transport'::transaction_category, 'expense'::transaction_type, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 15000, 'Salary', 'income'::transaction_category, 'income'::transaction_type, NOW() - INTERVAL '1 day');

-- Create test budget
INSERT INTO budgets (user_id, category, limit_amount, period)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'food'::transaction_category, 15000, 'monthly');

-- Create test savings goal
INSERT INTO savings_goals (user_id, name, emoji, target_amount, current_amount)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Emergency Fund', '🛡', 500000, 50000);
```

## Step 7: Verify Installation

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Should show:
- users
- transactions
- budgets
- savings_goals
- bank_connections
- ai_insights

### Check RLS is Enabled

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Should show `rowsecurity = on` for all tables.

### Check Functions Exist

```sql
SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

Should include:
- `update_updated_at_column`
- `get_monthly_spending`
- `get_budget_status`
- `calculate_financial_score`

## Step 8: Start Backend Server

```bash
cd api
npm install
npm run dev
```

Should output:
```
🚀 Zeni API Server running on port 3000
📍 Environment: development
🔐 CORS enabled for: http://localhost:8081,exp://10.253.231.139:8081
```

## Database Schema Overview

### Tables Created:

1. **users** - User accounts and profiles
   - Fields: id, email, encrypted_password, first_name, last_name, monthly_income, monthly_expense_target, notification settings
   - RLS: Users can only access their own profile

2. **transactions** - Income/expense transactions
   - Fields: id, user_id, amount, description, category, type (expense/income), date, is_impulse, source (manual/bank)
   - Supports 13 categories: food, transport, entertainment, utilities, shopping, health, income, education, rent, betting, subscriptions, transfers, other
   - RLS: Users can only access their own transactions

3. **budgets** - Category spending limits
   - Fields: id, user_id, category, limit_amount, period (monthly/weekly)
   - RLS: Users can only access their own budgets

4. **savings_goals** - Financial goals
   - Fields: id, user_id, name, emoji, target_amount, current_amount, deadline, priority
   - RLS: Users can only access their own goals

5. **bank_connections** - Connected bank accounts
   - Fields: id, user_id, bank_name, account_number, account_name, paystack_access_code, last_synced_at
   - RLS: Users can only access their own connections

6. **ai_insights** - AI-generated insights
   - Fields: id, user_id, type, severity, title, message, action_items, generated_at, expires_at, read_at
   - RLS: Users can only access their own insights

### Custom Functions:

- `get_monthly_spending(user_id)` - Total spending in current month
- `get_budget_status(user_id)` - Budget utilization for all categories
- `calculate_financial_score(user_id)` - Financial health score (0-100)

### Indexes:

Performance indexes on:
- User lookups by email
- Transaction queries by user, category, date
- Budget lookups by user and category
- Insight lookups by user and creation date

## Troubleshooting

### Error: "SUPABASE_URL or keys not defined"
- Make sure your `.env` file has all three keys filled in
- Restart your API server after updating `.env`

### Error: "Column 'encrypted_password' does not exist"
- Run the migration again in SQL Editor
- Verify all CREATE TABLE statements executed successfully

### Error: "RLS policy ... violates"
- This means your JWT token isn't being sent properly
- Ensure your frontend is including `Authorization: Bearer <token>` header

### Transactions not syncing from bank?
- Check `bank_connections.paystack_access_code` is set
- Verify Paystack OAuth has completed
- Check `last_synced_at` timestamp in bank_connections table

## Next Steps

1. ✅ Schema created
2. ✅ RLS policies enabled
3. → Implement auth endpoints (signup, signin, refresh token)
4. → Implement transaction CRUD endpoints
5. → Connect React Native app to API
6. → Set up Paystack bank sync
7. → Integrate Claude API for insights

## Support

For Supabase issues:
- Docs: https://supabase.com/docs
- Dashboard: https://app.supabase.com
- Status: https://status.supabase.com

For API issues:
- Check server logs: `npm run dev`
- Database logs in Supabase Dashboard > Logs
