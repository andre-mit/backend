const db = require('./db');
const crypto = require('crypto');

async function run() {
  try {
    try {
      const schema = process.env.DB_NAME || 'condo_market';
      const cols = await db.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'password_hash'",
        [schema]
      );
      if (!cols || (Array.isArray(cols) && cols.length === 0)) {
        await db.query('ALTER TABLE profiles ADD COLUMN password_hash TEXT');
        console.log('Added password_hash column.');
      } else {
        console.log('password_hash column already exists.');
      }
    } catch (e) {
      console.warn('Could not ensure password_hash column (maybe running in stub mode):', e.message);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64);
    const password_hash = `${salt}:${derived.toString('hex')}`;

    const payload = {
      id,
      email,
      display_name: 'Usuário de Teste',
      avatar_url: null,
      password_hash,
    };

    try {
      await db.query('INSERT INTO profiles SET ?', [payload]);
      console.log('Inserted test user:', email);
    } catch (err) {
      console.warn('Insert likely failed (maybe user exists or stub mode):', err.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(2);
  }
}

run();
