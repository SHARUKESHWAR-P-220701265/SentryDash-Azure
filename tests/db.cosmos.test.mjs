// tests/db.cosmos.test.mjs
import 'dotenv/config';
import { jest } from '@jest/globals';
import {
  initCosmos,
  getAllRooms,
  getRoomById,
  queryRooms,
  closeCosmos
} from '../db.cosmos.js';

jest.setTimeout(30000);

beforeAll(async () => {
  await initCosmos();
});

afterAll(async () => {
  await closeCosmos();
});

describe('Cosmos DB Room Queries', () => {

  test('getAllRooms returns an array with at least one room', async () => {
    const rooms = await getAllRooms();

    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);

    // sanity check object shape
    const first = rooms[0];
    expect(first).toHaveProperty('id');
  });

  test('getRoomById returns a specific room when the ID exists', async () => {
    const rooms = await getAllRooms();
    expect(rooms.length).toBeGreaterThan(0);

    const first = rooms[0];
    const found = await getRoomById(first.id);

    expect(found).toBeDefined();
    expect(found).toHaveProperty('id', first.id);
  });

  test('queryRooms executes a parameterized query successfully', async () => {
    const query = 'SELECT * FROM c WHERE c.capacity >= @cap';
    const params = [{ name: '@cap', value: 1 }];

    const results = await queryRooms(query, params);

    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      expect(results[0]).toHaveProperty('capacity');
    }
  });

});
