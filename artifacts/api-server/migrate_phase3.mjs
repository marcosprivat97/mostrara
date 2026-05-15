import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[migrate_phase3] DATABASE_URL ausente, pulando migracao");
  process.exit(0);
}

const SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_role text DEFAULT 'merchant';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_courier_id text;

UPDATE users
SET account_role = COALESCE(account_role, 'merchant')
WHERE account_role IS NULL OR account_role = '';

ALTER TABLE users ALTER COLUMN account_role SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier_id ON orders(assigned_courier_id);
`;

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(SQL);
    console.log("[migrate_phase3] migracao aplicada");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[migrate_phase3] falhou:", error);
  process.exit(1);
});
