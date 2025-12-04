const fs = require('fs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = ''
} = process.env;

async function run() {
  if (!DB_HOST || !DB_USER) {
    console.error('DB_HOST and DB_USER must be set in .env');
    process.exit(1);
  }

  const sql = fs.readFileSync(__dirname + '/schema.sql', 'utf8');
  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    console.log('Connected to MySQL server. Running schema...');
    try {
      // First try bulk execution
      await conn.query(sql);
      console.log('Schema executed successfully (bulk).');
    } catch (bulkErr) {
      console.warn('Bulk schema execution failed, attempting idempotent per-statement apply...');
      const stmts = sql
        .split(/;\s*\n|;\s*$/gm)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      let applied = 0;
      for (const s of stmts) {
        try {
          await conn.query(s);
          applied++;
        } catch (err) {
          const msg = String(err && err.message || '').toLowerCase();
          const code = err && (err.code || err.errno);
          // Ignore idempotent errors when re-running schema
          // ER_DUP_KEYNAME (1061), ER_TABLE_EXISTS_ERROR (1050), ER_DB_CREATE_EXISTS (1007),
          // ER_DUP_INDEX (1831/1832 messages), 'already exists' strings for FKs/indexes
          if (
            code === 1061 || // Duplicate key name
            code === 1050 || // Table already exists
            code === 1007 || // Database exists
            msg.includes('duplicate key name') ||
            msg.includes('already exists') ||
            msg.includes('can\'t create table') && msg.includes('errno: 1050')
          ) {
            console.warn('  Skipping idempotent error:', err.message);
            continue;
          }
          console.error('  Statement failed:', s);
          throw err;
        }
      }
      console.log(`Schema executed successfully (per-statement, ${applied} statements applied).`);
    }

    // Ensure unique index on profiles.email exists (compatible with older MySQL)
    try {
      const [rows] = await conn.query(
        `SELECT COUNT(1) AS cnt
         FROM information_schema.statistics
         WHERE table_schema = ? AND table_name = 'profiles' AND index_name = 'uniq_email'`,
        [DB_NAME || 'condo_market']
      );
      const exists = Array.isArray(rows) && rows.length > 0 && Number(rows[0].cnt) > 0;
      if (!exists) {
        try {
          await conn.query(`ALTER TABLE \`${DB_NAME || 'condo_market'}\`.\`profiles\` ADD UNIQUE KEY \`uniq_email\` (\`email\`)`);
          console.log('Created unique index uniq_email on profiles.email');
        } catch (e) {
          const msg = String(e && e.message || '').toLowerCase();
          if (msg.includes('duplicate') || msg.includes('exists')) {
            console.warn('  Skipping idempotent unique index creation:', e.message);
          } else {
            throw e;
          }
        }
      } else {
        console.log('Unique index uniq_email already present.');
      }
    } catch (e) {
      console.warn('Could not verify/create uniq_email index:', e.message);
    }
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to run schema:', err.message);
    process.exit(2);
  }
}

run();
