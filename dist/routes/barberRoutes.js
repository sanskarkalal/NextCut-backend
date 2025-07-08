"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const barberServices_1 = require("../services/barberServices");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv/config");
const auth_1 = require("./middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
const getErrorCode = (error) => {
    if (typeof error === "object" && error !== null && "code" in error) {
        return error.code;
    }
    return undefined;
};
router.post("/signup", async (req, res) => {
    try {
        const { name, username, password, lat, long } = req.body;
        if (!name || !username || !password || !lat || !long) {
            res.status(400).json({
                error: "All fields are required: name, username, password, lat, long",
            });
            return;
        }
        const latNum = parseFloat(lat);
        const longNum = parseFloat(long);
        if (isNaN(latNum) || isNaN(longNum)) {
            res.status(400).json({ error: "Invalid latitude or longitude values" });
            return;
        }
        if (latNum < -90 || latNum > 90) {
            res.status(400).json({ error: "Latitude must be between -90 and 90" });
            return;
        }
        if (longNum < -180 || longNum > 180) {
            res.status(400).json({ error: "Longitude must be between -180 and 180" });
            return;
        }
        const barber = await (0, barberServices_1.createBarber)(name, username, password, latNum, longNum);
        const token = jsonwebtoken_1.default.sign({ sub: barber.id, role: "BARBER" }, JWT_SECRET, {
            expiresIn: "8h",
        });
        res.status(201).json({
            barber,
            msg: "Barber Created Successfully",
            token,
        });
    }
    catch (error) {
        console.error("Barber signup error:", error);
        if (getErrorCode(error) === "P2002") {
            res.status(409).json({ msg: "Username already exists" });
            return;
        }
        res.status(500).json({
            msg: "Error occurred during barber signup",
            error: getErrorMessage(error),
        });
    }
});
router.post("/signin", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: "Username and password are required" });
            return;
        }
        const barber = await (0, barberServices_1.authenticateBarber)(username, password);
        if (!barber) {
            res.status(401).json({ msg: "Invalid username or password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ sub: barber.id, role: "BARBER" }, JWT_SECRET, {
            expiresIn: "8h",
        });
        res.json({
            barber,
            msg: "Barber Signed In Successfully",
            token,
        });
    }
    catch (error) {
        console.error("Barber signin error:", error);
        res.status(500).json({
            msg: "Error occurred during barber sign in",
            error: getErrorMessage(error),
        });
    }
});
router.get("/queue", auth_1.authenticateJWT, async (req, res) => {
    try {
        const barberId = req.user?.id;
        if (!barberId) {
            res.status(401).json({ error: "Barber not authenticated" });
            return;
        }
        if (req.user?.role !== "BARBER") {
            res.status(403).json({ error: "Access denied. Barber role required." });
            return;
        }
        const queue = await (0, barberServices_1.getQueue)(barberId);
        res.json({
            barberId,
            queueLength: queue.length,
            queue: queue.map((entry, index) => ({
                position: index + 1,
                queueId: entry.id,
                user: entry.user,
                enteredAt: entry.enteredAt,
            })),
        });
    }
    catch (error) {
        console.error("Error fetching barber queue:", error);
        res
            .status(500)
            .json({
            error: "Internal server error",
            details: getErrorMessage(error),
        });
    }
});
router.post("/remove-user", auth_1.authenticateJWT, async (req, res) => {
    try {
        const barberId = req.user?.id;
        const { userId } = req.body;
        if (!barberId) {
            res.status(401).json({ error: "Barber not authenticated" });
            return;
        }
        if (req.user?.role !== "BARBER") {
            res.status(403).json({ error: "Access denied. Barber role required." });
            return;
        }
        if (!userId) {
            res.status(400).json({ error: "User ID is required" });
            return;
        }
        const result = await (0, barberServices_1.removeUserFromQueue)(barberId, userId);
        if (!result.success) {
            res.status(400).json({ msg: result.message });
            return;
        }
        res.json({
            msg: "User removed from queue successfully",
            data: result.data,
        });
    }
    catch (error) {
        console.error("Error removing user from queue:", error);
        res
            .status(500)
            .json({
            error: "Internal server error",
            details: getErrorMessage(error),
        });
    }
});
exports.default = router;
