const db = require('./db');

async function run() {
  try {
    const rows = await db.query('SELECT id, email, display_name, password_hash FROM profiles LIMIT 100');
    console.log('profiles:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying profiles:', err.message);
    process.exit(2);
  }
}

run();
