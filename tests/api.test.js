// tests/api.test.js

const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("../index"); // Make sure index.js exports your Express app

// File path for resetting data
const DATA_FILE = path.join(__dirname, "../data/rooms.json");
const originalData = fs.readFileSync(DATA_FILE, "utf-8");

let server;

beforeAll((done) => {
  // Start the server on a random available port for testing
  server = app.listen(0, done);
});

afterAll((done) => {
  // Close the server after all tests to prevent open handles
  server.close(done);
});

afterEach(() => {
  // Restore rooms.json after each test to avoid polluting data
  fs.writeFileSync(DATA_FILE, originalData, "utf-8");
});

describe("SentryDash API Tests", () => {
  // Health check
  test("GET /health should return status ok", async () => {
    const res = await request(server).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  // Home route
  test("GET / should return running message", async () => {
    const res = await request(server).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/SentryDash Backend Container is running successfully!/);
  });

  // Get all rooms
  test("GET /api/rooms should return array of rooms", async () => {
    const res = await request(server).get("/api/rooms");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Get single room
  test("GET /api/room/:id should return correct room or 404", async () => {
    const res = await request(server).get("/api/room/A101");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", "A101");

    const res404 = await request(server).get("/api/room/INVALID");
    expect(res404.statusCode).toBe(404);
  });

  // Mark entry
  test("POST /api/entry should increment or decrement currentCount", async () => {
    const resEnter = await request(server)
      .post("/api/entry")
      .send({ roomId: "A101", action: "enter" });
    expect(resEnter.statusCode).toBe(200);
    expect(resEnter.body).toHaveProperty("currentCount");

    const resExit = await request(server)
      .post("/api/entry")
      .send({ roomId: "A101", action: "exit" });
    expect(resExit.statusCode).toBe(200);
    expect(resExit.body).toHaveProperty("currentCount");
  });

  // Suggest alternate room
  test("POST /api/suggest should return suggestion or no-overflow message", async () => {
    const res = await request(server)
      .post("/api/suggest")
      .send({ roomId: "A101" });

    expect(res.statusCode).toBe(200);

    // Handle both possible responses
    if (res.body.hasOwnProperty("overflow") && res.body.hasOwnProperty("suggestion")) {
      // Overflow case
      expect(typeof res.body.overflow).toBe("number");
      expect(res.body.suggestion).toBeDefined();
    } else {
      // No overflow case
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("room");
    }
  });
});
