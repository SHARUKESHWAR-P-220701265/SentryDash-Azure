// SentryDash Prototype Backend
// Node.js + Express + Azure App Insights

const fs = require("fs");
const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// ------------------------------
// 🔹 Application Insights Setup
// ------------------------------
const appInsights = require("applicationinsights");
const aiConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_CONNECTION_STRING || "";

if (!aiConnectionString) {
  console.warn("⚠️ APPINSIGHTS_CONNECTION_STRING not set. Telemetry disabled.");
} else {
  try {
    appInsights
      .setup(aiConnectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .start();
    console.log("✅ Azure Application Insights initialized");
  } catch (err) {
    console.error("❌ Failed to initialize Application Insights:", err.message);
  }
}
const telemetryClient = appInsights.defaultClient || null;

// ------------------------------
// 🔹 Simulated "Database"
// ------------------------------
const DATA_FILE = path.join(__dirname, "data", "rooms.json");

function readRooms() {
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(data);
}

function writeRooms(rooms) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(rooms, null, 2), "utf8");
}

// ------------------------------
// 🔹 Middleware
// ------------------------------
app.use(express.json());

// ------------------------------
// 🔹 Routes
// ------------------------------
app.use((req, res, next) => {
  // Allow requests from any origin (you can restrict this to specific origins in production)
  res.header('Access-Control-Allow-Origin', '*');
  
  // Allow these HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Allow these headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Home
app.get("/", (req, res) => {
  if (telemetryClient) telemetryClient.trackEvent({ name: "HomeAccessed" });
  res.send("🏫 SentryDash Backend Container is running successfully!");
});

// Get all rooms
app.get("/api/rooms", (req, res, next) => {
  try {
    const rooms = readRooms();
    if (telemetryClient) telemetryClient.trackEvent({ name: "RoomsListFetched" });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// Get one room
app.get("/api/room/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const rooms = readRooms();
    const room = rooms.find((r) => r.id === id);
    if (!room) {
      const error = new Error(`Room ${id} not found`);
      error.status = 404;
      throw error;
    }
    if (telemetryClient)
      telemetryClient.trackEvent({ name: "RoomFetched", properties: { roomId: id } });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Mark entry or exit
app.post("/api/entry", (req, res, next) => {
  try {
    const { roomId, action } = req.body;
    if (!roomId || !action) {
      const error = new Error("Missing roomId or action");
      error.status = 400;
      throw error;
    }

    const rooms = readRooms();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      const error = new Error("Room not found");
      error.status = 404;
      throw error;
    }

    if (action === "enter") room.currentCount++;
    else if (action === "exit") room.currentCount = Math.max(0, room.currentCount - 1);
    else {
      const error = new Error("Invalid action. Use 'enter' or 'exit'.");
      error.status = 400;
      throw error;
    }

    writeRooms(rooms);

    if (telemetryClient) {
      telemetryClient.trackEvent({
        name: "EntryEvent",
        properties: { roomId, action },
        measurements: { newCount: room.currentCount },
      });
      telemetryClient.trackMetric({ name: `occupancy_${roomId}`, value: room.currentCount });

      if (room.currentCount > room.capacity) {
        telemetryClient.trackEvent({
          name: "CapacityExceeded",
          properties: { roomId, capacity: room.capacity, currentCount: room.currentCount },
        });
      }
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Suggest alternate room if capacity exceeded
app.post("/api/suggest", (req, res, next) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      const error = new Error("Missing roomId");
      error.status = 400;
      throw error;
    }

    const rooms = readRooms();
    const src = rooms.find((r) => r.id === roomId);
    if (!src) {
      const error = new Error("Source room not found");
      error.status = 404;
      throw error;
    }

    const overflow = Math.max(0, src.currentCount - src.capacity);
    if (overflow === 0)
      return res.json({ message: "No overflow detected", room: src });

    const candidates = rooms
      .filter((r) => r.id !== roomId)
      .map((r) => ({
        ...r,
        available: Math.max(0, r.capacity - r.currentCount),
      }))
      .filter((r) => r.available >= overflow)
      .sort((a, b) => a.distance - b.distance);

    const suggestion = candidates.length ? candidates[0] : null;

    if (telemetryClient)
      telemetryClient.trackEvent({
        name: "SuggestionGenerated",
        properties: {
          roomId,
          overflow,
          suggestion: suggestion ? suggestion.id : "none",
        },
      });

    res.json({ overflow, suggestion });
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 🔹 Centralized Error Handler
// ------------------------------

// 404 handler (no route matched)
app.use((req, res, next) => {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// Global error middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[${status}] ${message}`);
  if (telemetryClient) {
    telemetryClient.trackException({
      exception: err,
      properties: { route: req.originalUrl },
    });
  }

  res.status(status).json({ error: message });
});

// ------------------------------
// 🔹 Start the Server
// ------------------------------
app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 SentryDash backend container running on port ${port}`)
);

module.exports = app; // For testing