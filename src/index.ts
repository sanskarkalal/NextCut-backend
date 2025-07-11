import "dotenv/config";
import express from "express";
import cors from "cors";

// Import route modules
import userRouter from "./routes/userRoutes";
import barberRouter from "./routes/barberRoutes";

const app = express();

console.log("=== ENVIRONMENT DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT from env:", process.env.PORT);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("========================");

// CORS configuration
app.use(
  cors({
    origin: [
      "https://next-cut-frontend-e6zu.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check endpoints
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "NextCut API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NextCut API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/user", userRouter);
app.use("/barber", barberRouter);

// Debug endpoint (for development)
app.get("/debug", (req, res) => {
  res.json({
    origin: req.headers.origin,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: "NextCut API Debug Info",
    routes: {
      user: [
        "POST /user/signup - Phone + Name signup",
        "POST /user/signin - Phone signin",
        "POST /user/joinqueue - Join barber queue with service",
        "POST /user/leavequeue - Leave current queue",
        "GET /user/queue-status - Get current queue status",
        "POST /user/barbers - Get nearby barbers",
      ],
      barber: [
        "POST /barber/signup - Barber registration (hidden)",
        "POST /barber/signin - Barber login",
        "GET /barber/queue - Get barber's queue",
        "POST /barber/remove-user - Remove user from queue",
      ],
    },
  });
});

// Catch-all 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      user: "/user/*",
      barber: "/barber/*",
      health: "/health",
      debug: "/debug",
    },
  });
});

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    });
  }
);

const PORT = process.env.PORT || 3000;

console.log("Attempting to start server on 0.0.0.0:" + PORT);
app.listen(PORT, () => {
  console.log(`✅ Server successfully listening on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("📡 Available endpoints:");
  console.log("  Health: GET /health");
  console.log("  User Auth: POST /user/signup, POST /user/signin");
  console.log("  Queue: POST /user/joinqueue, POST /user/leavequeue");
  console.log("  Barber Auth: POST /barber/signup, POST /barber/signin");
  console.log("  Debug: GET /debug");
});
