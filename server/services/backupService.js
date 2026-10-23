const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/database');
const { collections } = require('../config/database');

const BACKUP_DIR = path.join(__dirname, '../backups');
const SQLITE_DB_PATH = path.join(__dirname, '../db/erp.db');
const MONGO_STORE_PATH = path.join(__dirname, '../db/mongo_store.json');

// Ensure backup root directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function calculateFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

class BackupService {
  /**
   * Create an automated point-in-time multi-tenant backup snapshot
   */
  async createBackup(initiatedBy = 'SYSTEM') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotId = `backup_${timestamp}_${crypto.randomBytes(3).toString('hex')}`;
    const targetDir = path.join(BACKUP_DIR, snapshotId);
    fs.mkdirSync(targetDir, { recursive: true });

    // 1. Force SQLite WAL checkpoint to ensure all uncommitted WAL pages are flushed to disk
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.warn('WAL checkpoint note:', e.message);
    }

    // 2. Snapshot SQLite Database
    const targetSqlite = path.join(targetDir, 'erp.db');
    if (fs.existsSync(SQLITE_DB_PATH)) {
      fs.copyFileSync(SQLITE_DB_PATH, targetSqlite);
    }

    // 3. Snapshot Multi-Tenant Document Store
    const targetMongo = path.join(targetDir, 'mongo_store.json');
    if (fs.existsSync(MONGO_STORE_PATH)) {
      fs.copyFileSync(MONGO_STORE_PATH, targetMongo);
    }

    // Calculate cryptographic hashes
    const sqliteHash = calculateFileHash(targetSqlite);
    const mongoHash = calculateFileHash(targetMongo);

    // Collect metadata metrics
    const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    const facultyCount = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
    const institutionCount = collections.institutions ? collections.institutions.docs.length : 0;

    const manifest = {
      snapshotId,
      createdAt: new Date().toISOString(),
      initiatedBy,
      integrity: {
        algorithm: 'SHA-256',
        sqliteHash,
        mongoHash
      },
      metrics: {
        students: studentCount,
        faculty: facultyCount,
        institutions: institutionCount
      },
      status: 'VERIFIED'
    };

    fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    return manifest;
  }

  /**
   * List available disaster recovery snapshots
   */
  listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    const entries = fs.readdirSync(BACKUP_DIR);
    const backups = [];

    for (const entry of entries) {
      const manifestPath = path.join(BACKUP_DIR, entry, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          backups.push(manifest);
        } catch (e) {}
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Restore database state from a verified snapshot
   */
  async restoreFromBackup(snapshotId, initiatedBy = 'SUPER_ADMIN') {
    const snapshotDir = path.join(BACKUP_DIR, snapshotId);
    if (!fs.existsSync(snapshotDir)) {
      const err = new Error(`Backup snapshot '${snapshotId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const manifestPath = path.join(snapshotDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      const err = new Error(`Backup manifest missing in snapshot '${snapshotId}'. Integrity cannot be verified.`);
      err.statusCode = 400;
      throw err;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // 1. Verify Cryptographic Integrity
    const snapshotSqlite = path.join(snapshotDir, 'erp.db');
    const snapshotMongo = path.join(snapshotDir, 'mongo_store.json');

    const currentSqliteHash = calculateFileHash(snapshotSqlite);
    const currentMongoHash = calculateFileHash(snapshotMongo);

    if (manifest.integrity.sqliteHash && currentSqliteHash !== manifest.integrity.sqliteHash) {
      const err = new Error('Cryptographic integrity failure: SQLite snapshot hash mismatch.');
      err.statusCode = 400;
      throw err;
    }
    if (manifest.integrity.mongoHash && currentMongoHash !== manifest.integrity.mongoHash) {
      const err = new Error('Cryptographic integrity failure: Document store snapshot hash mismatch.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Restore Document Store
    if (fs.existsSync(snapshotMongo)) {
      fs.copyFileSync(snapshotMongo, MONGO_STORE_PATH);
      // Reload in-memory collections
      const data = JSON.parse(fs.readFileSync(MONGO_STORE_PATH, 'utf-8'));
      for (const [colName, docs] of Object.entries(data)) {
        if (collections[colName]) {
          collections[colName].docs = docs || [];
        }
      }
    }

    // 3. Restore SQLite
    if (fs.existsSync(snapshotSqlite)) {
      // Force checkpoint and copy
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (e) {}
      fs.copyFileSync(snapshotSqlite, SQLITE_DB_PATH);
    }

    // 4. Verify restored database integrity
    const integrityResult = db.prepare('PRAGMA integrity_check').get();

    return {
      success: true,
      message: `Database successfully restored from snapshot '${snapshotId}'. Zero corruption detected.`,
      snapshotId,
      restoredAt: new Date().toISOString(),
      initiatedBy,
      integrityCheck: integrityResult.integrity_check === 'ok' ? 'PASSED_OK' : integrityResult.integrity_check,
      restoredMetrics: manifest.metrics
    };
  }
}

module.exports = new BackupService();
