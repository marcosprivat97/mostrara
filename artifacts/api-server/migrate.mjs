// Run migration to add missing columns to users table
const SUPABASE_URL = "https://wzytxexedahijpzbbucv.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eXR4ZXhlZGFoaWpwemJidWN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgyOTM4MCwiZXhwIjoyMDkzNDA1MzgwfQ.-GISiZ_GEkerHOSibgY7iqFa1WyHhWQw__6aW1d0L9o";

const migrations = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_badge boolean DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS free_forever boolean DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_cep text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_address text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_address_number text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_neighborhood text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_latitude text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS store_longitude text DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_primary text DEFAULT '#dc2626'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_secondary text DEFAULT '#111827'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_accent text DEFAULT '#ffffff'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_access_token text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_refresh_token text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_user_id text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_connected_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_access_token_expires_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_refresh_token_expires_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz`,
];

async function runMigrations() {
  for (const sql of migrations) {
    console.log("Running:", sql.substring(0, 80) + "...");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ query: sql }),
    });
    // rpc might not work for DDL; fallback to pg
    if (!res.ok) {
      const txt = await res.text();
      console.log("  RPC failed (expected):", res.status, txt.substring(0, 100));
    } else {
      console.log("  OK");
    }
  }
}

runMigrations().catch(console.error);
