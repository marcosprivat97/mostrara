const { Client } = require('pg');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const queries = [
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" text DEFAULT \'RJ\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_cep" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_address" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_address_number" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_neighborhood" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_latitude" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_longitude" text DEFAULT \'\'',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_access_token" text',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_refresh_token" text',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_user_id" text',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_connected_at" timestamp',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_access_token_expires_at" timestamp',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mp_refresh_token_expires_at" timestamp',
    `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "token_hash" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "used_at" timestamp,
      "created_at" timestamp DEFAULT now(),
      CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
    )`
  ];

  for (const q of queries) {
    console.log('Executing:', q.split('\n')[0]);
    await client.query(q);
  }
  
  console.log('OK');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
