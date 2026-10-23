const backupService = require('../services/backupService');

async function run() {
  console.log('📦 Starting Automated Multi-Tenant Database Backup Snapshot...');
  try {
    const manifest = await backupService.createBackup('CLI_AUTOMATED_JOB');
    console.log('✅ Backup Snapshot Completed Successfully!');
    console.log(`   Snapshot ID : ${manifest.snapshotId}`);
    console.log(`   Timestamp   : ${manifest.createdAt}`);
    console.log(`   SQLite Hash : ${manifest.integrity.sqliteHash}`);
    console.log(`   Mongo Hash  : ${manifest.integrity.mongoHash}`);
    console.log(`   Records     : ${manifest.metrics.students} students, ${manifest.metrics.faculty} faculty`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Backup Failed:', err.message);
    process.exit(1);
  }
}

run();
