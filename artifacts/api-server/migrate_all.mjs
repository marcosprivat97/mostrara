// Full migration - creates all missing tables and columns
const SUPABASE_URL = "https://wzytxexedahijpzbbucv.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eXR4ZXhlZGFoaWpwemJidWN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgyOTM4MCwiZXhwIjoyMDkzNDA1MzgwfQ.-GISiZ_GEkerHOSibgY7iqFa1WyHhWQw__6aW1d0L9o";

const SQL = `
-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_whatsapp text NOT NULL,
  customer_email text DEFAULT '',
  customer_document text DEFAULT '',
  delivery_method text DEFAULT 'delivery',
  cep text DEFAULT '',
  street text DEFAULT '',
  number text DEFAULT '',
  complement text DEFAULT '',
  neighborhood text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  reference text DEFAULT '',
  payment_method text DEFAULT 'pix',
  notes text DEFAULT '',
  items text NOT NULL DEFAULT '[]',
  coupon_code text DEFAULT '',
  discount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL,
  payment_provider text DEFAULT 'whatsapp',
  payment_status text DEFAULT 'pending',
  mp_payment_id text,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  mp_status_detail text,
  paid_at timestamptz,
  status text DEFAULT 'pendente',
  whatsapp_clicked_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  customer_name text NOT NULL,
  customer_whatsapp text DEFAULT '',
  sale_date date NOT NULL,
  product_price numeric(12,2) NOT NULL,
  amount_paid numeric(12,2) NOT NULL,
  payment_method text DEFAULT 'pix',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text DEFAULT 'percent',
  value numeric(12,2) NOT NULL,
  active boolean DEFAULT true,
  max_uses integer,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text DEFAULT 'melhoria',
  title text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'aberto',
  admin_note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI LOGS
CREATE TABLE IF NOT EXISTS ai_logs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area text DEFAULT 'merchant',
  prompt text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- PRODUCTS missing columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS unlimited_stock boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS options text DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- USERS missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_hours text DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_fee_type text DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_fee_amount numeric(12,2) DEFAULT 0;

-- ORDERS missing columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) DEFAULT 0;
`;

async function run() {
  console.log("Running full migration...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (res.ok) {
    console.log("SUCCESS via rpc/exec_sql");
    return;
  }

  // rpc/exec_sql may not exist, use the pg connection directly
  console.log("rpc/exec_sql not available, trying pg directly...");
  
  // Use the DATABASE_URL from .env
  const DATABASE_URL = "postgresql://postgres.wzytxexedahijpzbbucv:24526082Fe.%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
  
  // Dynamic import pg
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to database");
  
  await client.query(SQL);
  console.log("SUCCESS - All tables created / columns added");
  
  await client.end();
}

run().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
