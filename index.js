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
import { getItemFrom, queryFrom, upsertInto } from './db.cosmos.js';

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
    const { roomId, action, userId } = req.body;
    if (!roomId || !action)
      return res.status(400).json({ error: "Missing roomId or action" });

    const room = await getRoomById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    // maintain occupants list for tracking
    if (!Array.isArray(room.occupants)) room.occupants = [];

    if (action === "enter") {
      if (userId) {
        if (!room.occupants.includes(userId)) room.occupants.push(userId);
        room.currentCount = room.occupants.length;
      } else {
        room.currentCount++;
      }
    } else if (action === "exit") {
      if (userId) {
        room.occupants = room.occupants.filter((u) => u !== userId);
        room.currentCount = room.occupants.length;
      } else {
        room.currentCount = Math.max(0, room.currentCount - 1);
      }
    }
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

// Simple login by email (no password). Returns role and profile.
app.post('/api/login', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // Check teachers first
    const teachers = await queryFrom('teachers', 'SELECT * FROM c WHERE c.email = @email', [{ name: '@email', value: email }]);
    if (teachers.length > 0) {
      const t = teachers[0];
      return res.json({ role: 'teacher', profile: t });
    }

    // Check students
    const students = await queryFrom('students', 'SELECT * FROM c WHERE c.email = @email', [{ name: '@email', value: email }]);
    if (students.length > 0) {
      const s = students[0];
      return res.json({ role: 'student', profile: s });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (err) {
    next(err);
  }
});

// Reserve a room for a class at a scheduled time (teacher action)
app.post("/api/reserve", async (req, res, next) => {
  try {
    const { roomId, course, section, teacherId, startTime } = req.body;
    if (!roomId || !course || !section || !teacherId || !startTime) {
      return res.status(400).json({ error: "Missing required reservation fields" });
    }

    const room = await getRoomById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Store the upcoming reservation in the room document
    room.upcomingReservation = {
      course,
      section,
      teacherId,
      startTime // ISO string or timestamp
    };

    // persist
    await upsertRoom(room);

    // find occupants who are not enrolled
    const occupants = Array.isArray(room.occupants) ? room.occupants : [];
    const nonEnrolled = [];
    for (const occId of occupants) {
      const student = await getItemFrom('students', occId).catch(() => null);
      if (!student) continue;
      const enrolled = Array.isArray(student.coursesEnrolled) && student.coursesEnrolled.includes(course);
      if (!enrolled) nonEnrolled.push({ id: student.id, name: student.name, email: student.email });
    }

    // compute a single suggestion for this room overflow/relocation
    const rooms = await getAllRooms();
    const src = room;
    const candidates = rooms
      .filter((r) => r.id !== roomId)
      .map((r) => {
        const dx = (r.location?.x ?? 0) - (src.location?.x ?? 0);
        const dy = (r.location?.y ?? 0) - (src.location?.y ?? 0);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { ...r, available: Math.max(0, r.capacity - r.currentCount), distance };
      })
      .filter((r) => r.available > 0)
      .sort((a, b) => a.distance - b.distance);
    const suggestion = candidates[0] || null;

    telemetryClient?.trackEvent({
      name: "RoomReserved",
      properties: { roomId, course, section, teacherId, startTime, nonEnrolledCount: nonEnrolled.length }
    });

    res.json({ message: 'Reservation created', reservation: room.upcomingReservation, nonEnrolled, suggestion });
  } catch (err) {
    next(err);
  }
});

// Suggest alternate room if capacity exceeded (dynamic distance)
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

    // Calculate Euclidean distance from src to each candidate
    const candidates = rooms
      .filter((r) => r.id !== roomId)
      .map((r) => {
        const dx = (r.location?.x ?? 0) - (src.location?.x ?? 0);
        const dy = (r.location?.y ?? 0) - (src.location?.y ?? 0);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return {
          ...r,
          available: Math.max(0, r.capacity - r.currentCount),
          distance
        };
      })
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
