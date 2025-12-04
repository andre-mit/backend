const http = require('http');

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const email = 'devtest@local';
    const password = 'devpass123';
    const display_name = 'Dev Test';

    console.log('Creating profile...', email);
    const r1 = await post('/api/profiles', { email, password, display_name });
    console.log('Create profile response:', r1.status, r1.body);

    console.log('Attempting login...');
    const r2 = await post('/api/auth/login', { email, password });
    console.log('Login response:', r2.status, r2.body);

    try {
      const js = JSON.parse(r2.body);
      if (js && js.token) console.log('TOKEN:', js.token);
    } catch (e) {}
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
