import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const c = new Client(process.env.DATABASE_URL);

async function run() {
  await c.connect();
  const res = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.log('Current columns:');
  console.log(res.rows.map(x => x.column_name).join('\n'));
  await c.end();
}
run().catch(e => { console.error(e.message); c.end(); });
