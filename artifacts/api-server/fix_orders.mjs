import pg from "pg";
const { Client } = pg;
const c = new Client("postgresql://postgres.wzytxexedahijpzbbucv:24526082Fe.%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres");

const SQL = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_document text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cep text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS street text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS number text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS complement text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS neighborhood text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS state text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'whatsapp';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_qr_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_ticket_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_status_detail text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
`;

await c.connect();
await c.query(SQL);
console.log("SUCCESS - 19 missing columns added to orders");
await c.end();
