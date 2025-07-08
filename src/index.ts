import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Debug all environment variables
console.log("=== ENVIRONMENT DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT from env:", process.env.PORT);
console.log(
  "All env vars:",
  Object.keys(process.env).filter(
    (k) => k.includes("PORT") || k.includes("RAILWAY")
  )
);
console.log("========================");

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NextCut API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || "NOT_SET",
    allPorts: Object.keys(process.env).filter((k) => k.includes("PORT")),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Health check passed",
  });
});

// Try multiple port strategies
const PORT = process.env.PORT || process.env.RAILWAY_PUBLIC_PORT || 3000;
const HOST = "0.0.0.0";

console.log(`Attempting to start server on ${HOST}:${PORT}`);

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server successfully listening on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

server.on("error", (error) => {
  console.error("❌ Server failed to start:", error);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});
