import fs from 'fs';
import path from 'path';
import { initCosmos, upsertRoom } from '../db.cosmos.js';

async function run() {
  const dataPath = path.resolve(process.cwd(), 'data/rooms.json');
  if (!fs.existsSync(dataPath)) {
    console.error('data/rooms.json not found in project root:', dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const rooms = JSON.parse(raw);
  if (!Array.isArray(rooms)) {
    console.error('rooms.json must be an array of room objects');
    process.exit(1);
  }

  console.log('Initializing Cosmos DB connection...');
  const { container } = await initCosmos();
  console.log('Container ready:', container.id);

  console.log(`Migrating ${rooms.length} rooms to Cosmos DB...`);
  let count = 0;
  for (const r of rooms) {
    if (!r.id) {
      // ensure there is an id; if not, use a generated id
      r.id = String(r.name || `room-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    }
    await upsertRoom(r);
    count++;
    if (count % 50 === 0) process.stdout.write(`.${count}`);
  }

  console.log(`\nMigration complete: ${count} rooms inserted/updated.`);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});