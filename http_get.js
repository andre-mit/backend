const http = require('http');
const url = process.argv[2] || 'http://localhost:3000/api/profiles/test%40teste.com';
http.get(url, (res) => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('body:', data);
    process.exit(0);
  });
}).on('error', (e) => { console.error('error', e.message); process.exit(2); });
