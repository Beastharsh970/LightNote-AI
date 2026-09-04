import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import apiRoutes from "./routes/api";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Ensure required directories exist
const dirs = [
  path.join(__dirname, "../uploads"),
  path.join(__dirname, "../output"),
  path.join(__dirname, "../temp"),
];
dirs.forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve output videos statically
app.use("/output", express.static(path.join(__dirname, "../output")));

// API routes
app.use("/api", apiRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  await connectDB();
  const port = parseInt(env.PORT, 10);
  app.listen(port, () => {
    console.log(`🚀 LightNoteAI server running on http://localhost:${port}`);
    console.log(`🤖 AI Provider: ${env.AI_PROVIDER}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
