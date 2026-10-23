const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../db/erp.db');
const outputPath = path.join(__dirname, '../db/sqlite_snapshot.json');

const db = new Database(dbPath, { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

const dump = {};
for (const { name } of tables) {
  try {
    dump[name] = db.prepare(`SELECT * FROM ${name}`).all();
  } catch (err) {
    console.warn(`Could not dump table ${name}:`, err.message);
  }
}

fs.writeFileSync(outputPath, JSON.stringify(dump, null, 2), 'utf-8');
console.log(`✅ Successfully dumped ${tables.length} tables to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
db.close();
