"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userServices_1 = require("../services/userServices");
require("dotenv/config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("./middleware/auth");
const userRouter = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
userRouter.post("/signup", async (req, res) => {
    try {
        console.log("Signup request received:", {
            body: req.body,
            headers: req.headers.origin,
        });
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            console.log("Missing fields in signup request");
            res.status(400).json({ error: "Name, email and password are required." });
            return;
        }
        const user = await (0, userServices_1.createUser)(name, email, password);
        const token = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: "8h",
        });
        console.log("User signup successful:", {
            userId: user.id,
            email: user.email,
        });
        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            msg: "User created successfully",
            token,
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            msg: "Error occurred during sign up",
            error: getErrorMessage(error),
        });
    }
});
userRouter.post("/signin", async (req, res) => {
    try {
        console.log("Signin request received:", {
            email: req.body.email,
            hasPassword: !!req.body.password,
            origin: req.headers.origin,
        });
        const { email, password } = req.body;
        if (!email || !password) {
            console.log("Missing email or password in signin request");
            res.status(400).json({ error: "Email and password are required." });
            return;
        }
        console.log("Attempting to authenticate user:", email);
        const user = await (0, userServices_1.authenticateUser)(email, password);
        if (!user) {
            console.log("Authentication failed for user:", email);
            res.status(401).json({ msg: "Invalid email or password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: "8h",
        });
        console.log("User signin successful:", {
            userId: user.id,
            email: user.email,
        });
        res.json({
            user,
            msg: "User Signed In Successfully",
            token,
        });
    }
    catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({
            msg: "Error occurred during sign in",
            error: getErrorMessage(error),
        });
    }
});
userRouter.post("/joinqueue", auth_1.authenticateJWT, async (req, res) => {
    try {
        const { barberId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "User not authenticated" });
            return;
        }
        if (!barberId) {
            res.status(400).json({ error: "Barber ID is required" });
            return;
        }
        const queueEntry = await (0, userServices_1.joinQueue)(barberId, userId);
        res.json({
            msg: "You have joined the queue",
            queue: queueEntry,
        });
    }
    catch (error) {
        console.error("Join queue error:", error);
        res
            .status(500)
            .json({ msg: "Error joining queue", error: getErrorMessage(error) });
    }
});
userRouter.post("/leavequeue", auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "User not authenticated" });
            return;
        }
        const result = await (0, userServices_1.removeFromQueue)(userId);
        if (!result.success) {
            res.status(400).json({ msg: result.message });
            return;
        }
        res.json({
            msg: "You have been removed from the queue",
            data: result.data,
        });
    }
    catch (error) {
        console.error("Leave queue error:", error);
        res
            .status(500)
            .json({ msg: "Error leaving queue", error: getErrorMessage(error) });
    }
});
userRouter.get("/nearby", auth_1.authenticateJWT, async (req, res) => {
    try {
        const lat = req.query.lat;
        const long = req.query.long;
        if (!lat || !long) {
            res.status(400).json({
                error: "Latitude and longitude query parameters are required",
            });
            return;
        }
        const qLat = parseFloat(lat);
        const qLong = parseFloat(long);
        if (isNaN(qLat) || isNaN(qLong)) {
            res.status(400).json({ error: "Invalid latitude or longitude values" });
            return;
        }
        if (qLat < -90 || qLat > 90) {
            res.status(400).json({ error: "Latitude must be between -90 and 90" });
            return;
        }
        if (qLong < -180 || qLong > 180) {
            res
                .status(400)
                .json({ error: "Longitude must be between -180 and 180" });
            return;
        }
        const radius = req.query.radius
            ? parseFloat(req.query.radius)
            : 5;
        if (isNaN(radius) || radius <= 0) {
            res.status(400).json({ error: "Radius must be a positive number" });
            return;
        }
        const barbers = await (0, userServices_1.getBarbersNearby)(qLat, qLong, radius);
        res.json({
            barbers,
            searchLocation: { lat: qLat, long: qLong },
            radiusKm: radius,
        });
    }
    catch (error) {
        console.error("Error fetching nearby barbers:", error);
        res
            .status(500)
            .json({
            error: "Internal server error",
            details: getErrorMessage(error),
        });
    }
});
userRouter.get("/queue-status", auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "User not authenticated" });
            return;
        }
        const queueStatus = await (0, userServices_1.getUserQueueStatus)(userId);
        res.json({ queueStatus });
    }
    catch (error) {
        console.error("Error fetching queue status:", error);
        res
            .status(500)
            .json({
            error: "Internal server error",
            details: getErrorMessage(error),
        });
    }
});
exports.default = userRouter;
