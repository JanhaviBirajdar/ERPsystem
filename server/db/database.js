const os = require('os');
const path = require('path');
const fs = require('fs');

let DB_PATH = path.join(__dirname, 'erp.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Vercel Serverless environment handling: copy db to writable temp directory
if (process.env.VERCEL) {
  try {
    const tmpDbPath = path.join(os.tmpdir(), 'erp.db');
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, tmpDbPath);
    }
    DB_PATH = tmpDbPath;
  } catch (err) {
    console.warn('Vercel temp db setup notice:', err.message);
  }
}

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
  const Database = require('better-sqlite3');
  // Initialize SQLite database with WAL mode for high concurrency
  db = new Database(DB_PATH, { verbose: null });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Run schema initialization if database is newly provisioned
  if (fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);
  }
} catch (err) {
  console.warn('SQLite initialization notice:', err.message);
  // Resilient fallback mock driver in case better-sqlite3 native binary cannot be loaded in serverless container
  db = {
    prepare: () => ({
      get: () => null,
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 })
    }),
    pragma: () => {},
    exec: () => {}
  };
}

module.exports = db;
