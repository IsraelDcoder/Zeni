/**
 * Migration Runner for Supabase
 * Executes SQL migration files against your Supabase database
 * 
 * Usage: npx tsx scripts/run-migrations.ts
 */

import fs from "fs";
import path from "path";
import { supabaseAdmin } from "../src/services/supabase";

const migrationsDir = path.join(process.cwd(), "migrations");

interface Migration {
  name: string;
  path: string;
  content: string;
}

async function getMigrations(): Promise<Migration[]> {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

  return files
    .sort()
    .map((file) => ({
      name: file,
      path: path.join(migrationsDir, file),
      content: fs.readFileSync(path.join(migrationsDir, file), "utf-8"),
    }));
}

async function runMigrations() {
  console.log("🚀 Starting Supabase Migrations...\n");

  try {
    const migrations = await getMigrations();

    if (migrations.length === 0) {
      console.log("❌ No migration files found in migrations/");
      return;
    }

    console.log(`📋 Found ${migrations.length} migration(s):\n`);
    migrations.forEach((m) => console.log(`   - ${m.name}`));
    console.log("\n");

    // Execute each migration
    for (const migration of migrations) {
      console.log(`⏳ Running: ${migration.name}`);

      try {
        // Split by semicolons and execute statements
        const statements = migration.content
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          // Use the admin client to execute raw SQL
          // Note: supabaseAdmin doesn't have a direct SQL execution method
          // We need to use the query method through the PostgreSQL client
          const { error } = await supabaseAdmin.rpc("execute_sql", {
            sql: statement,
          });

          if (error) {
            throw error;
          }
        }

        console.log(`✅ ${migration.name} completed\n`);
      } catch (error) {
        console.error(
          `❌ Error running ${migration.name}:`,
          error instanceof Error ? error.message : error
        );
        console.log(
          "\n⚠️  Consider running migrations manually via Supabase Dashboard > SQL Editor\n"
        );
        throw error;
      }
    }

    console.log("✅ All migrations completed successfully!\n");
  } catch (error) {
    console.error(
      "❌ Migration failed:",
      error instanceof Error ? error.message : error
    );
    console.log(
      "\n📖 Alternative: Visit https://supabase.com/dashboard/project/bnlwqnqzjwktiiqufljp/sql"
    );
    console.log(
      "   1. Go to SQL Editor\n   2. Copy-paste contents from migrations/ folder\n   3. Execute each migration\n"
    );
    process.exit(1);
  }
}

runMigrations();
