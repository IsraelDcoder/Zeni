import { createClient } from "@supabase/supabase-js";

// Environment variables should already be loaded by server.ts
// Get environment variables
const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

// Lazy validation - will happen when client is created
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.warn("⚠️  Warning: Supabase environment variables not fully configured");
  console.warn(`   SUPABASE_URL: ${supabaseUrl ? "✓" : "✗"}`);
  console.warn(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✓" : "✗"}`);
  console.warn(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? "✓" : "✗"}`);
}

// Client for user operations (uses RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabaseClient;
