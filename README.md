Condo Market - Backend (Node.js)

This backend folder provides stub REST endpoints for the Flutter app and is
ready to be connected to a MySQL database.

Quick start
1. Copy `.env.example` to `.env` and fill the MySQL values (DB_HOST, DB_USER, DB_NAME, etc).
2. Install dependencies:

   npm install

3. Run in development (restarts on changes):

   npm run dev

4. The server listens on `PORT` (default 3000) and exposes endpoints under `/api`:

   - `GET /api/products` - list products
   - `GET /api/products/:id` - get product
   - `POST /api/products` - create product
   - `PUT /api/products/:id` - update product
   - `DELETE /api/products/:id` - delete product

   - `GET /api/profiles/:id` - get profile
   - `PUT /api/profiles/:id` - update profile

   - `GET /api/reviews?to_user_id=...` - get reviews
   - `POST /api/reviews` - create review

   - `GET /api/chat/sessions?product_id=&buyer_id=&seller_id=` - get chat session (matching)
   - `POST /api/chat/sessions` - create chat session
   - `GET /api/chat/messages?chat_id=` - get chat messages
   - `POST /api/chat/messages` - create chat message

   - `POST /api/storage/upload` - upload file (multipart/form-data, field `file`)
   - `GET /api/storage/public/:name` - serve uploaded file

Notes
- If MySQL env vars are not configured, the backend runs in "stub mode":
  endpoints respond with empty lists or simple placeholders so you can
  wire and test the Flutter app UI without a database yet.

- When you configure MySQL, `db.js` will attempt to create a connection pool.
  Make sure your database schema matches the app expectations (tables: products,
  profiles, reviews, chat_sessions, chat_messages).

- You can adapt these routes to your exact schema or add authentication as needed.

