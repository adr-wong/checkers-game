/**
 * index.ts — Hono server entry point for the web application.
 * 
 * This is the main entry point that starts the Hono server and establishes
 * the MongoDB connection using environment variables for configuration.
 */

import mongoose from "mongoose";
import app from "./src/server/app";

// ─── Environment Configuration ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/checkers";

// ─── MongoDB Connection ────────────────────────────────────────────────────

async function connectToMongoDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected successfully");
}

// ─── Server Startup ─────────────────────────────────────────────────────────

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectToMongoDB();

  // Start the Hono server
  console.log(`🚀 Web server starting on port ${PORT}`);
  
  Bun.serve({
    fetch: app.fetch,
    port: PORT
  });
  console.log(`🌐 Server running at http://localhost:${PORT}`);
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});