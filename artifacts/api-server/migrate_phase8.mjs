import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[migrate_phase8] DATABASE_URL ausente, pulando migracao");
  process.exit(0);
}

const SQL = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_pickup_at timestamp;

CREATE INDEX IF NOT EXISTS idx_orders_courier_pickup_at ON orders(courier_pickup_at);
`;

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(SQL);
    console.log("[migrate_phase8] migracao aplicada");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[migrate_phase8] falhou:", error);
  process.exit(1);
});
