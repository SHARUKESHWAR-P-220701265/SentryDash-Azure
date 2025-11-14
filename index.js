// SentryDash Prototype Backend (ES Modules)
// Node.js + Express + Azure App Insights + CosmosDB
import express from "express";
import dotenv from "dotenv";
import appInsights from "applicationinsights";

// CosmosDB functions
import {
  initCosmos,
  getAllRooms,
  getRoomById,
  upsertRoom,
  queryRooms,
} from "./db.cosmos.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ------------------------------
// 🔹 Application Insights Setup
// ------------------------------
const aiConnectionString =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
  process.env.APPINSIGHTS_CONNECTION_STRING ||
  "";

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
// 🔹 Middleware
// ------------------------------
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ------------------------------
// 🔹 Routes (CosmosDB version)
// ------------------------------

// Health check
app.get("/health", async (req, res) => {
  res.json({ status: "ok" });
});

// Home
app.get("/", (req, res) => {
  telemetryClient?.trackEvent({ name: "HomeAccessed" });
  res.send("🏫 SentryDash Backend (CosmosDB) is running successfully!");
});

// Get all rooms
app.get("/api/rooms", async (req, res, next) => {
  try {
    const rooms = await getAllRooms();
    telemetryClient?.trackEvent({ name: "RoomsListFetched" });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// Get one room
app.get("/api/room/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const room = await getRoomById(id);

    if (!room) {
      return res.status(404).json({ error: `Room ${id} not found` });
    }

    telemetryClient?.trackEvent({
      name: "RoomFetched",
      properties: { roomId: id },
    });

    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Mark entry or exit
app.post("/api/entry", async (req, res, next) => {
  try {
    const { roomId, action } = req.body;
    if (!roomId || !action)
      return res.status(400).json({ error: "Missing roomId or action" });

    const room = await getRoomById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    if (action === "enter") room.currentCount++;
    else if (action === "exit")
      room.currentCount = Math.max(0, room.currentCount - 1);
    else return res.status(400).json({ error: "Invalid action" });

    const updatedRoom = await upsertRoom(room);

    telemetryClient?.trackEvent({
      name: "EntryEvent",
      properties: { roomId, action },
      measurements: { newCount: room.currentCount },
    });

    if (room.currentCount > room.capacity) {
      telemetryClient?.trackEvent({
        name: "CapacityExceeded",
        properties: {
          roomId,
          capacity: room.capacity,
          currentCount: room.currentCount,
        },
      });
    }

    res.json(updatedRoom);
  } catch (err) {
    next(err);
  }
});

// Suggest alternate room if capacity exceeded
app.post("/api/suggest", async (req, res, next) => {
  try {
    const { roomId } = req.body;
    if (!roomId)
      return res.status(400).json({ error: "Missing roomId in request" });

    const rooms = await getAllRooms();
    const src = rooms.find((r) => r.id === roomId);

    if (!src) return res.status(404).json({ error: "Source room not found" });

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

    const suggestion = candidates[0] || null;

    telemetryClient?.trackEvent({
      name: "SuggestionGenerated",
      properties: {
        roomId,
        overflow,
        suggestion: suggestion?.id || "none",
      },
    });

    res.json({ overflow, suggestion });
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 🔹 Error Handler
// ------------------------------
app.use((req, res, next) => {
  res.status(404).json({ error: `Not Found: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(`[${err.status || 500}] ${err.message}`);
  telemetryClient?.trackException({
    exception: err,
    properties: { route: req.originalUrl },
  });
  res.status(err.status || 500).json({ error: err.message });
});

// ------------------------------
// 🔹 Start Server
// ------------------------------
app.listen(port, "0.0.0.0", async () => {
  console.log(`🚀 SentryDash backend running on port ${port}`);

  try {
    await initCosmos();
    console.log("🌍 Cosmos DB connection initialized");
  } catch (err) {
    console.error("❌ Failed to initialize Cosmos DB:", err.message);
  }
});
