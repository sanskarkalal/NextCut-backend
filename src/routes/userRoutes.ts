// src/routes/userRoutes.ts
import express, { Request, Response } from "express";
import {
  createUser,
  authenticateUser,
  joinQueue,
  getBarbersNearby,
  removeFromQueue,
  getUserQueueStatus,
} from "../services/userServices";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { authenticateJWT, AuthenticatedRequest } from "./middleware/auth";

const userRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// User signup with phone number
userRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    console.log("Phone signup request received:", {
      body: req.body,
      headers: req.headers.origin,
    });

    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      console.log("Missing fields in signup request");
      res.status(400).json({ error: "Name and phone number are required." });
      return;
    }

    const user = await createUser(name, phoneNumber);
    const token = jwt.sign(
      { sub: user.id, phoneNumber: user.phoneNumber },
      JWT_SECRET!,
      {
        expiresIn: "8h",
      }
    );

    console.log("User signup successful:", {
      userId: user.id,
      phoneNumber: user.phoneNumber,
    });

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
      msg: "User created successfully",
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      msg: "Error occurred during sign up",
      error: getErrorMessage(error),
    });
  }
});

// User signin with phone number only
userRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    console.log("Phone signin request received:", {
      phoneNumber: req.body.phoneNumber,
      origin: req.headers.origin,
    });

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      console.log("Missing phone number in signin request");
      res.status(400).json({ error: "Phone number is required." });
      return;
    }

    const user = await authenticateUser(phoneNumber);

    if (!user) {
      console.log("Phone authentication failed for:", phoneNumber);
      res
        .status(401)
        .json({ msg: "Phone number not found. Please sign up first." });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, phoneNumber: user.phoneNumber },
      JWT_SECRET!,
      {
        expiresIn: "8h",
      }
    );

    console.log("Phone authentication successful for:", phoneNumber);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
      msg: "User signed in successfully",
      token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      msg: "Error occurred during sign in",
      error: getErrorMessage(error),
    });
  }
});

// Join queue with service selection
userRouter.post(
  "/joinqueue",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Join queue request:", {
        userId: req.user?.id,
        body: req.body,
      });

      const { barberId, service } = req.body;

      if (!barberId || !service) {
        res
          .status(400)
          .json({ error: "Barber ID and service type are required." });
        return;
      }

      const queueEntry = await joinQueue(req.user!.id, barberId, service);

      console.log("User joined queue successfully:", {
        userId: req.user?.id,
        barberId,
        service,
      });

      res.status(201).json({
        msg: "Successfully joined the queue",
        queue: queueEntry,
      });
    } catch (error) {
      console.error("Join queue error:", error);
      res.status(500).json({
        msg: "Failed to join queue",
        error: getErrorMessage(error),
      });
    }
  }
);

// Get nearby barbers
userRouter.post("/barbers", async (req: Request, res: Response) => {
  try {
    console.log("Get barbers request:", req.body);

    const { lat, long, radius = 10 } = req.body;

    if (lat === undefined || long === undefined) {
      res.status(400).json({ error: "Latitude and longitude are required." });
      return;
    }

    const barbers = await getBarbersNearby(lat, long, radius);

    // Add queue length and estimated wait time for each barber
    const barbersWithQueueInfo = barbers.map((barber) => {
      const queueLength = barber.queueEntries.length;

      // Calculate total estimated wait time for all services in queue
      let totalWaitTime = 0;
      barber.queueEntries.forEach((entry: any) => {
        const serviceTimes = {
          haircut: 20,
          beard: 5,
          "haircut+beard": 25,
        };
        totalWaitTime +=
          serviceTimes[entry.service as keyof typeof serviceTimes] || 20;
      });

      return {
        id: barber.id,
        name: barber.name,
        username: barber.username,
        lat: barber.lat,
        long: barber.long,
        distance: (barber as any).distance,
        queueLength,
        estimatedWaitTime: totalWaitTime,
        queue: barber.queueEntries.map((entry) => ({
          id: entry.id,
          user: entry.user,
          enteredAt: entry.enteredAt,
          service: (entry as any).service,
        })),
      };
    });

    console.log(`Found ${barbersWithQueueInfo.length} barbers nearby`);

    res.json({
      barbers: barbersWithQueueInfo,
    });
  } catch (error) {
    console.error("Get barbers error:", error);
    res.status(500).json({
      msg: "Failed to get nearby barbers",
      error: getErrorMessage(error),
    });
  }
});

// Leave queue
userRouter.post(
  "/leavequeue",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Leave queue request:", { userId: req.user?.id });

      const result = await removeFromQueue(req.user!.id);

      console.log("User left queue successfully:", { userId: req.user?.id });

      res.json({
        msg: "Successfully left the queue",
        data: result,
      });
    } catch (error) {
      console.error("Leave queue error:", error);
      res.status(500).json({
        msg: "Failed to leave queue",
        error: getErrorMessage(error),
      });
    }
  }
);

// Get queue status
userRouter.get(
  "/queue-status",
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queueStatus = await getUserQueueStatus(req.user!.id);

      res.json({
        queueStatus,
      });
    } catch (error) {
      console.error("Queue status error:", error);
      res.status(500).json({
        msg: "Failed to get queue status",
        error: getErrorMessage(error),
      });
    }
  }
);

export default userRouter;
