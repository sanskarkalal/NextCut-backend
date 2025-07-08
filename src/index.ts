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
    message: "NextCut API is running - Minimal Version",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
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
  res.json({ message: "Test route working" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NextCut API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
