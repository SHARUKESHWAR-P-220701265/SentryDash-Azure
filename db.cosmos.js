import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

if (!endpoint || !key) {
  // Defer throwing to runtime functions to allow better error messages there
}

let client;
let database;
let container;

export async function initCosmos({ databaseId = 'sentrydash', containerId = 'rooms', partitionKey = '/id' } = {}) {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }

  if (client) return { client, database, container };

  client = new CosmosClient({ endpoint, key });

  const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
  database = db;

  const { container: coll } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey], kind: 'Hash' }
  });

  container = coll;
  return { client, database, container };
}

export async function getAllRooms() {
  if (!container) await initCosmos();
  const iterator = container.items.readAll();
  const { resources } = await iterator.fetchAll();
  return resources;
}

export async function upsertRoom(room) {
  if (!container) await initCosmos();
  if (!room.id) {
    throw new Error('room object must have an "id" property to be used as the partition key');
  }
  const { resource } = await container.items.upsert(room);
  return resource;
}

export async function getRoomById(id) {
  if (!container) await initCosmos();
  const { resource } = await container.item(id, id).read().catch(() => ({ resource: null }));
  return resource;
}

export async function queryRooms(query, params = []) {
  if (!container) await initCosmos();
  const iterator = container.items.query({ query, parameters: params });
  const { resources } = await iterator.fetchAll();
  return resources;
}

export async function closeCosmos() {
  client = undefined;
  database = undefined;
  container = undefined;
}