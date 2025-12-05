const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/storage', require('./routes/storage'));

app.use('/ping', (req, res) => {
  res.send('pong');
});

app.get('/', (req, res) => {
  res.json({ message: 'Condo Market backend (stub mode). Configure MySQL to enable full functionality.' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
