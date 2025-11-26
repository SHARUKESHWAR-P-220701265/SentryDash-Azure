import fs from 'fs';
import path from 'path';
import { initCosmos, upsertRoom, upsertInto } from '../db.cosmos.js';

async function migrateFileToContainer(filePath, containerId, upsertFn) {
  if (!fs.existsSync(filePath)) {
    console.warn(`${filePath} not found, skipping ${containerId} migration.`);
    return 0;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    console.error(`${filePath} must contain an array`);
    process.exit(1);
  }

  console.log(`Migrating ${items.length} items to container '${containerId}'...`);
  let count = 0;
  for (const it of items) {
    if (!it.id) {
      it.id = String(it.name || `item-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    }
    if (upsertFn) await upsertFn(containerId, it);
    else await upsertInto(containerId, it);
    count++;
    if (count % 50 === 0) process.stdout.write(`.${count}`);
  }
  console.log(`\n${count} items migrated to '${containerId}'.`);
  return count;
}

async function run() {
  console.log('Initializing Cosmos DB (will create containers if missing)...');
  await initCosmos();

  const base = process.cwd();
  const roomsPath = path.resolve(base, 'data/rooms.json');
  const usersPath = path.resolve(base, 'data/users.json');
  const teachersPath = path.resolve(base, 'data/teachers.json');

  await migrateFileToContainer(roomsPath, 'new-rooms', async (containerId, doc) => {
    // reuse upsertRoom behaviour (rooms container)
    await upsertRoom(doc);
  });

  await migrateFileToContainer(usersPath, 'students');
  await migrateFileToContainer(teachersPath, 'teachers');

  console.log('All migrations complete.');
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});