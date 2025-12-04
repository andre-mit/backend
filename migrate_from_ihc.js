const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
} = process.env;

const OLD_DB = 'ihc_marketplace';
const NEW_DB = 'condo_market';
const TABLES = [
  'profiles',
  'products',
  'reviews',
  'chat_sessions',
  'chat_messages',
];

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    const [schemas] = await conn.query(
      "SELECT SCHEMA_NAME as name FROM information_schema.schemata WHERE SCHEMA_NAME IN (?, ?)",
      [OLD_DB, NEW_DB]
    );
    const hasOld = schemas.some(s => s.name === OLD_DB);
    const hasNew = schemas.some(s => s.name === NEW_DB);

    if (!hasNew) {
      console.log(`Creating and initializing ${NEW_DB}...`);
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await conn.query(schemaSql);
      console.log('New schema applied.');
    } else {
      console.log(`${NEW_DB} already exists.`);
    }

    if (hasOld) {
      console.log(`Attempting to copy data from ${OLD_DB} to ${NEW_DB}...`);
      for (const t of TABLES) {
        try {
          await conn.query(`INSERT IGNORE INTO \`${NEW_DB}\`.\`${t}\` SELECT * FROM \`${OLD_DB}\`.\`${t}\``);
          console.log(`  ✔ Copied table: ${t}`);
        } catch (e) {
          console.warn(`  ⚠ Skipped table ${t}: ${e.message}`);
        }
      }
    } else {
      console.log(`${OLD_DB} not found; data copy skipped.`);
    }
  } finally {
    await conn.end();
  }
}

main().then(() => {
  console.log('Migration completed.');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
