const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { Client } = require('pg');

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('No DATABASE_URL in environment');
    process.exit(2);
  }
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name LIMIT 200");
    if (!res.rows.length) {
      console.log('No user tables found in database.');
    } else {
      console.log('Found tables:');
      res.rows.forEach(r => {
        const schema = r.schema || r.table_schema || r.schemaName || 'public'
        const name = r.tableName || r.tableName || r.name || '<unknown>'
        console.log(`${schema}.${name}`)
      });
    }
  } catch (err) {
    console.error('Error querying database:', err.message || err);
    process.exit(3);
  } finally {
    await client.end();
  }
})();
