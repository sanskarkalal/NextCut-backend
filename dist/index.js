"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
console.log("=== ENVIRONMENT DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT from env:", process.env.PORT);
console.log("All env vars:", Object.keys(process.env).filter((k) => k.includes("PORT") || k.includes("RAILWAY")));
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
const PORT = process.env.PORT || process.env.RAILWAY_PUBLIC_PORT || 3000;
const HOST = "0.0.0.0";
console.log(`Attempting to start server on ${HOST}:${PORT}`);
const server = app.listen(PORT, () => {
    console.log(`✅ Server successfully listening on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
server.on("error", (error) => {
    console.error("❌ Server failed to start:", error);
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => {
        process.exit(0);
    });
});
