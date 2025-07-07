// src/routes/userRoutes.ts
import express, { Request, Response } from "express";
import {
  createUser,
  authenticateUser,
  joinQueue,
  getBarbersNearby,
  removeFromQueue,
} from "../services/userServices";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { authenticateJWT, AuthenticatedRequest } from "./middleware/auth";

const userRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// User signup
userRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    console.log("Signup request body:", req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required." });
      return;
    }

    const user = await createUser(name, email, password);
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET!, {
      expiresIn: "8h",
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res
      .status(500)
      .json({ msg: "Error occurred during sign up", error: error.message });
  }
});

// User signin
userRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      res.status(401).json({ msg: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET!, {
      expiresIn: "8h",
    });

    res.json({
      user,
      msg: "User Signed In Successfully",
      token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res
      .status(500)
      .json({ msg: "Error occurred during sign in", error: error.message });
  }
});

// Join queue
userRouter.post(
  "/joinqueue",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
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

      const queueEntry = await joinQueue(barberId, userId);

      res.json({
        msg: "You have joined the queue",
        queue: queueEntry,
      });
    } catch (error) {
      console.error("Join queue error:", error);
      res
        .status(500)
        .json({ msg: "Error joining queue", error: error.message });
    }
  }
);

// Remove from queue
userRouter.post(
  "/leavequeue",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const result = await removeFromQueue(userId);

      if (!result.success) {
        res.status(400).json({ msg: result.message });
        return;
      }

      res.json({
        msg: "You have been removed from the queue",
        data: result.data,
      });
    } catch (error) {
      console.error("Leave queue error:", error);
      res
        .status(500)
        .json({ msg: "Error leaving queue", error: error.message });
    }
  }
);

// Get nearby barbers - FIXED
userRouter.get(
  "/nearby",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const lat = req.query.lat as string;
      const long = req.query.long as string;

      if (!lat || !long) {
        res
          .status(400)
          .json({
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

      // Validate latitude and longitude ranges
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
        ? parseFloat(req.query.radius as string)
        : 5;

      if (isNaN(radius) || radius <= 0) {
        res.status(400).json({ error: "Radius must be a positive number" });
        return;
      }

      const barbers = await getBarbersNearby(qLat, qLong, radius);

      res.json({
        barbers,
        searchLocation: { lat: qLat, long: qLong },
        radiusKm: radius,
      });
    } catch (error) {
      console.error("Error fetching nearby barbers:", error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
);

// Get user's queue status
userRouter.get(
  "/queue-status",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      // You'll need to implement this function in userServices
      // const queueStatus = await getUserQueueStatus(userId);
      // res.json({ queueStatus });

      res.json({
        msg: "Queue status endpoint - implement getUserQueueStatus function",
      });
    } catch (error) {
      console.error("Error fetching queue status:", error);
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
);

export default userRouter;
