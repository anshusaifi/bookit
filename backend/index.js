// index.js — server entry point.
// Loads env, starts the HTTP server.
// Application logic lives in src/app.js.

require('dotenv').config();

const app  = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ BookIt backend running on port ${PORT}`);
});
