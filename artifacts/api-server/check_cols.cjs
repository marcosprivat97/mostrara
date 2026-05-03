const { Client } = require('pg');
const c = new Client('postgresql://postgres.wzytxexedahijpzbbucv:24526082Fe.%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres');

async function run() {
  await c.connect();
  const res = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.log(res.rows.map(x => x.column_name).join('\n'));
  await c.end();
}
run().catch(e => { console.error(e.message); c.end(); });
