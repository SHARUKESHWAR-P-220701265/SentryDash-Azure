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

export async function initCosmos({ databaseId = 'sentrydash' } = {}) {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }

  if (client && database) return { client, database };

  client = new CosmosClient({ endpoint, key });

  const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
  database = db;

  // Do NOT create a default container here; use getContainer when a specific container is required.
  return { client, database };
}

// Helper: ensure and return a container (defaults to 'new-rooms')
async function getContainer(containerId = 'new-rooms', partitionKey = '/id') {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }
  if (!client) client = new CosmosClient({ endpoint, key });
  if (!database) {
    const { database: db } = await client.databases.createIfNotExists({ id: 'sentrydash' });
    database = db;
  }
  const { container: coll } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey], kind: 'Hash' }
  });
  return coll;
}

export async function getAllRooms() {
  const coll = await getContainer('new-rooms', '/id');
  const iterator = coll.items.readAll();
  const { resources } = await iterator.fetchAll();
  return resources;
}

export async function upsertRoom(room) {
  const coll = await getContainer('new-rooms', '/id');
  if (!room.id) {
    throw new Error('room object must have an "id" property to be used as the partition key');
  }
  const { resource } = await coll.items.upsert(room);
  return resource;
}

export async function getRoomById(id) {
  const coll = await getContainer('new-rooms', '/id');
  const { resource } = await coll.item(id, id).read().catch(() => ({ resource: null }));
  return resource;
}

export async function queryRooms(query, params = []) {
  const coll = await getContainer('new-rooms', '/id');
  const iterator = coll.items.query({ query, parameters: params });
  const { resources } = await iterator.fetchAll();
  return resources;
}

export async function closeCosmos() {
  client = undefined;
  database = undefined;
  container = undefined;
}

// Generic upsert to any container (creates container if needed)
export async function upsertInto(containerId, doc, partitionKey = '/id') {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }
  if (!client) client = new CosmosClient({ endpoint, key });
  if (!database) {
    const { database: db } = await client.databases.createIfNotExists({ id: 'sentrydash' });
    database = db;
  }
  const { container: coll } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey], kind: 'Hash' }
  });
  const { resource } = await coll.items.upsert(doc);
  return resource;
}

export async function getItemFrom(containerId, id) {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }
  if (!client) client = new CosmosClient({ endpoint, key });
  if (!database) {
    const { database: db } = await client.databases.createIfNotExists({ id: 'sentrydash' });
    database = db;
  }
  const { container: coll } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ['/id'], kind: 'Hash' }
  });
  const { resource } = await coll.item(id, id).read().catch(() => ({ resource: null }));
  return resource;
}

export async function queryFrom(containerId, query, params = []) {
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment');
  }
  if (!client) client = new CosmosClient({ endpoint, key });
  if (!database) {
    const { database: db } = await client.databases.createIfNotExists({ id: 'sentrydash' });
    database = db;
  }
  const { container: coll } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ['/id'], kind: 'Hash' }
  });
  const iterator = coll.items.query({ query, parameters: params });
  const { resources } = await iterator.fetchAll();
  return resources;
}