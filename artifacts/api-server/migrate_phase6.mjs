import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[migrate_phase6] DATABASE_URL ausente, pulando migracao");
  process.exit(0);
}

const SQL = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_assignment_status text DEFAULT 'unassigned';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_assignment_updated_at timestamp;

UPDATE orders
SET courier_assignment_status = CASE
  WHEN assigned_courier_id IS NULL THEN 'unassigned'
  WHEN status IN ('saiu_entrega', 'em_rota', 'entregue') THEN 'accepted'
  WHEN COALESCE(courier_assignment_status, '') = '' THEN 'pending'
  ELSE courier_assignment_status
END
WHERE courier_assignment_status IS NULL OR courier_assignment_status = '';

UPDATE orders
SET courier_assignment_status = 'unassigned'
WHERE assigned_courier_id IS NULL AND COALESCE(courier_assignment_status, '') = '';

ALTER TABLE orders ALTER COLUMN courier_assignment_status SET DEFAULT 'unassigned';
ALTER TABLE orders ALTER COLUMN courier_assignment_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_courier_assignment_status ON orders(courier_assignment_status);
CREATE INDEX IF NOT EXISTS idx_orders_courier_assignment_updated_at ON orders(courier_assignment_updated_at);
`;

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(SQL);
    console.log("[migrate_phase6] migracao aplicada");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[migrate_phase6] falhou:", error);
  process.exit(1);
});
