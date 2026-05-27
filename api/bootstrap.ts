/**
 * Bootstrap Entry Point
 * Loads environment variables BEFORE any other code runs
 * Then dynamically imports the app
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  // Load environment variables FIRST
  const envPath = path.resolve(__dirname, ".env");
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("❌ Error loading .env file:", result.error.message);
    process.exit(1);
  }

  console.log(`🔧 .env loaded successfully (${Object.keys(result.parsed || {}).length} variables)`);
  if (process.env.SUPABASE_URL) {
    console.log(`✅ SUPABASE_URL: ${process.env.SUPABASE_URL.substring(0, 40)}...`);
  }
  if (process.env.API_PORT) {
    console.log(`✅ API_PORT: ${process.env.API_PORT}`);
  }

  // Now dynamically import and start the app
  console.log("🚀 Starting application...\n");
  try {
    await import("./src/server.js");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Run bootstrap
bootstrap().catch((error) => {
  console.error("❌ Bootstrap failed:", error);
  process.exit(1);
});
