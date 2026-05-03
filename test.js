const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://postgres.wzytxexedahijpzbbucv:24526082Fe.%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres' }); 
pool.query('SELECT 1').then(console.log).catch(console.error);
