import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import barberRoutes from "./routes/barberRoutes";

const app = express();

// CORS configuration with your exact domains
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // In production, allow your specific Vercel domain and all Vercel subdomains
    if (process.env.NODE_ENV === "production") {
      const allowedOrigins = [
        "https://next-cut-frontend-e6zu.vercel.app",
        "https://next-cut-frontend-e6zu-*.vercel.app",
        /https:\/\/next-cut-frontend.*\.vercel\.app$/,
        /https:\/\/.*\.vercel\.app$/, // All Vercel domains
      ];

      const isAllowed = allowedOrigins.some((pattern) => {
        if (typeof pattern === "string") {
          return origin === pattern;
        }
        return pattern.test(origin);
      });

      console.log(`CORS check - Origin: ${origin}, Allowed: ${isAllowed}`);
      return callback(null, isAllowed);
    }

    // In development, allow everything
    console.log(`CORS check (dev) - Origin: ${origin}, Allowed: true`);
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Add explicit OPTIONS handler for preflight requests
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NextCut API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NextCut API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check CORS
app.get("/debug", (req, res) => {
  res.json({
    origin: req.headers.origin,
    headers: req.headers,
    method: req.method,
    url: req.url,
  });
});

// API routes
app.use("/user", userRoutes);
app.use("/barber", barberRoutes);

// 404 handler
app.all("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NextCut API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
