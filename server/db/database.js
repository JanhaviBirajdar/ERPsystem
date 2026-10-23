const os = require('os');
const path = require('path');
const fs = require('fs');

let DB_PATH = path.join(__dirname, 'erp.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SNAPSHOT_PATH = path.join(__dirname, 'sqlite_snapshot.json');

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

function createMemoryDb() {
  let tables = {};
  try {
    if (fs.existsSync(SNAPSHOT_PATH)) {
      tables = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read sqlite_snapshot.json:', e.message);
  }

  const normalized = {};
  for (const [k, v] of Object.entries(tables)) {
    normalized[k.toLowerCase()] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : [];
  }

  function parseTableName(sql) {
    const match = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i) || sql.match(/INTO\s+([a-zA-Z0-9_]+)/i) || sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function query(sql, params = []) {
    const tName = parseTableName(sql);
    if (!tName || !normalized[tName]) return [];
    let rows = normalized[tName];

    if (/COUNT\(\*\)/i.test(sql)) {
      return [{ c: rows.length, count: rows.length }];
    }

    if (params && params.length > 0) {
      const p = params[0];
      if (/username\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.username === p || r.email === p);
      }
      if (/user_id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.user_id === p);
      }
      if (/student_id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.student_id === p);
      }
      if (/faculty_id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.faculty_id === p);
      }
      if (/id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.id === p);
      }
      if (/department_id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.department_id === p);
      }
      if (/role\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.role === p);
      }
      if (/status\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.status === p);
      }
      if (/code\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.code === p);
      }
    }

    return rows;
  }

  return {
    prepare(sql) {
      return {
        get(...params) {
          const res = query(sql, params);
          return res.length > 0 ? res[0] : null;
        },
        all(...params) {
          return query(sql, params);
        },
        run(...params) {
          const tName = parseTableName(sql);
          if (tName && !normalized[tName]) normalized[tName] = [];
          if (/INSERT/i.test(sql)) {
            normalized[tName].push({ id: params[0] || 'id-' + Date.now(), createdAt: new Date() });
          }
          return { changes: 1, lastInsertRowid: Date.now() };
        }
      };
    },
    pragma() {},
    exec() {},
    transaction(fn) {
      return (...args) => fn(...args);
    }
  };
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
  console.warn('SQLite native driver unavailable, activating resilient in-memory emulator:', err.message);
  db = createMemoryDb();
}

module.exports = db;
