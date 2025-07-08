import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

// Simple CORS
app.use(cors());
app.use(express.json());

// Health check endpoints
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NextCut API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Health check passed",
    timestamp: new Date().toISOString(),
  });
});

// Test route
app.get("/test", (req, res) => {
  res.json({
    message: "Test route working",
    env: process.env.NODE_ENV,
    port: process.env.PORT,
  });
});

// CRITICAL: Use Railway's PORT environment variable and bind to 0.0.0.0
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`NextCut API listening on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Railway PORT: ${process.env.PORT}`);
});

// Handle process signals
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});
