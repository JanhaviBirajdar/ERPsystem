const fs = require('fs');
const path = require('path');

const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/sqlite_snapshot.json'), 'utf-8'));

function createMemoryDb(snapshotData) {
  const tables = {};
  for (const [tName, rows] of Object.entries(snapshotData)) {
    tables[tName.toLowerCase()] = Array.isArray(rows) ? JSON.parse(JSON.stringify(rows)) : [];
  }

  function parseTableName(sql) {
    const match = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i) || sql.match(/INTO\s+([a-zA-Z0-9_]+)/i) || sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function query(sql, params) {
    const tName = parseTableName(sql);
    if (!tName || !tables[tName]) return [];
    let rows = tables[tName];

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
      if (/id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.id === p);
      }
      if (/department_id\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.department_id === p);
      }
      if (/role\s*=\s*\?/i.test(sql)) {
        return rows.filter(r => r.role === p);
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
          if (tName && !tables[tName]) tables[tName] = [];
          if (/INSERT/i.test(sql)) {
            tables[tName].push({ id: params[0] || 'id-' + Date.now(), createdAt: new Date() });
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

const memDb = createMemoryDb(snapshot);
const admin = memDb.prepare('SELECT * FROM users WHERE username = ?').get('admin');
const demoUsers = memDb.prepare('SELECT * FROM users WHERE is_active = 1').all();
const inst = memDb.prepare('SELECT * FROM institutions LIMIT 1').get();
console.log('✅ Admin found:', admin?.username, admin?.full_name);
console.log('✅ Demo users count:', demoUsers.length);
console.log('✅ Institution found:', inst?.name);
