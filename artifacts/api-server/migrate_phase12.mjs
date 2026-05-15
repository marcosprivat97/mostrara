import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[migrate_phase12] DATABASE_URL ausente, pulando migracao");
  process.exit(0);
}

const SQL = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at timestamp;
`;

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(SQL);
    console.log("[migrate_phase12] migracao aplicada");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[migrate_phase12] falhou:", error);
  process.exit(1);
});
