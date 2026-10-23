const backupService = require('../services/backupService');

async function run() {
  const snapshotId = process.argv[2];
  if (!snapshotId) {
    console.log('Usage: node server/scripts/restore.js <snapshot-id>');
    console.log('\nAvailable Backups:');
    const backups = backupService.listBackups();
    if (backups.length === 0) {
      console.log('   (No backup snapshots found in server/backups/)');
    } else {
      backups.forEach(b => console.log(`   - ${b.snapshotId} (${b.createdAt})`));
    }
    process.exit(1);
  }

  console.log(`🔄 Initiating Recovery from Snapshot '${snapshotId}'...`);
  try {
    const result = await backupService.restoreFromBackup(snapshotId, 'CLI_RECOVERY_OPERATOR');
    console.log('✅ Database Restoration Completed Successfully!');
    console.log(`   Message        : ${result.message}`);
    console.log(`   Integrity Check: ${result.integrityCheck}`);
    console.log(`   Restored At    : ${result.restoredAt}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Restoration Failed:', err.message);
    process.exit(1);
  }
}

run();
