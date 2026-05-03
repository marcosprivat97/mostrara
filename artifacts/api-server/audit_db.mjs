// Audit script: compares Drizzle schema expectations vs actual Supabase DB
import pg from "pg";
const { Client } = pg;

const DB_URL = "postgresql://postgres.wzytxexedahijpzbbucv:24526082Fe.%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";

// Expected schema from Drizzle definitions
const EXPECTED = {
  users: [
    "id","store_name","owner_name","email","password_hash","phone","whatsapp",
    "store_slug","store_type","description","city","state","store_cep","store_address",
    "store_address_number","store_neighborhood","store_latitude","store_longitude",
    "logo_url","cover_url","theme_primary","theme_secondary","theme_accent",
    "plan","free_forever","verified_badge","plan_started_at","plan_expires_at",
    "active","mp_access_token","mp_refresh_token","mp_user_id","mp_connected_at",
    "mp_access_token_expires_at","mp_refresh_token_expires_at",
    "onboarding_completed_at","created_at","last_login_at"
  ],
  products: [
    "id","user_id","name","category","storage","price","condition","battery",
    "warranty","stock","unlimited_stock","status","description","options","photos",
    "created_at","updated_at"
  ],
  orders: [
    "id","user_id","customer_name","customer_whatsapp","customer_email",
    "customer_document","delivery_method","cep","street","number","complement",
    "neighborhood","city","state","reference","payment_method","notes","items",
    "coupon_code","discount","total","payment_provider","payment_status",
    "mp_payment_id","mp_qr_code","mp_qr_code_base64","mp_ticket_url",
    "mp_status_detail","paid_at","status","whatsapp_clicked_at","confirmed_at",
    "canceled_at","created_at"
  ],
  sales: [
    "id","user_id","product_id","product_name","customer_name","customer_whatsapp",
    "sale_date","product_price","amount_paid","payment_method","notes","created_at"
  ],
  coupons: [
    "id","user_id","code","type","value","active","max_uses","used_count",
    "expires_at","created_at","updated_at"
  ],
  support_tickets: [
    "id","user_id","type","title","message","status","admin_note",
    "created_at","updated_at"
  ],
  ai_logs: [
    "id","user_id","area","prompt","response","created_at"
  ],
  password_reset_tokens: [
    "id","user_id","token_hash","expires_at","used_at","created_at"
  ],
};

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to Supabase DB\n");

  let allGood = true;

  for (const [table, expectedCols] of Object.entries(EXPECTED)) {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    const actualCols = res.rows.map(r => r.column_name);

    if (actualCols.length === 0) {
      console.log(`❌ TABLE "${table}" — DOES NOT EXIST`);
      allGood = false;
      continue;
    }

    const missing = expectedCols.filter(c => !actualCols.includes(c));
    const extra = actualCols.filter(c => !expectedCols.includes(c));

    if (missing.length === 0) {
      console.log(`✅ TABLE "${table}" — OK (${actualCols.length} columns)`);
    } else {
      console.log(`❌ TABLE "${table}" — MISSING ${missing.length} columns: ${missing.join(", ")}`);
      allGood = false;
    }
    if (extra.length > 0) {
      console.log(`   ℹ️  Extra columns in DB (not in schema): ${extra.join(", ")}`);
    }
  }

  console.log("\n" + (allGood ? "🎉 ALL TABLES AND COLUMNS MATCH!" : "⚠️  FIX NEEDED — see above"));

  // Generate ALTER TABLE statements for missing columns
  if (!allGood) {
    console.log("\n--- AUTO-FIX SQL ---");
    for (const [table, expectedCols] of Object.entries(EXPECTED)) {
      const res = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const actualCols = res.rows.map(r => r.column_name);
      if (actualCols.length === 0) continue; // table doesn't exist, already printed
      const missing = expectedCols.filter(c => !actualCols.includes(c));
      for (const col of missing) {
        console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} text;`);
      }
    }
  }

  await client.end();
}

run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
