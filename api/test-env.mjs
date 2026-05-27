import dotenv from "dotenv";

const envPath = "C:\\mobile\\api\\.env";
console.log(`Attempting to load: ${envPath}`);

const result = dotenv.config({ path: envPath });

console.log("Result:", {
  error: result.error?.message || null,
  parsed: result.parsed ? Object.keys(result.parsed) : null,
});

console.log("SUPABASE_URL from process.env:", process.env.SUPABASE_URL || "NOT SET");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "SET (truncated)" : "NOT SET");
