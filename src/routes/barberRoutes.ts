import { email } from "./../../node_modules/zod/src/v4/core/regexes";
import bcrypt from "bcrypt";
// src/routes/barberRoutes.ts
import { Router, Request, Response } from "express";
import prisma from "../db";
import {
  authenticateBarber,
  createBarber,
  getQueue,
} from "../services/barberServices";
const router = Router();
import jwt from "jsonwebtoken";
import "dotenv/config";
const JWT_SECRET = process.env.JWT_SECRET;
import { authenticateJWT } from "./middleware/auth";

// correct: define routes on the router
router.post("/signup", async (req, res) => {
  try {
    const { name, password, email, lat, long } = req.body;
    const latNum = parseFloat(lat);
    const longNum = parseFloat(long);

    const barber = await createBarber(name, email, password, latNum, longNum);
    const token = jwt.sign({ sub: barber.id, role: "BARBER" }, JWT_SECRET!, {
      expiresIn: "8h",
    });
    res.json({
      barber,
      msg: "Barber Created Successfully",
      token,
    });
  } catch (error) {
    res.json({ msg: error });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { password, email } = req.body;

    const barber = await authenticateBarber(email, password);
    if (!barber) {
      res.json({ msg: "Barber does not exist" });
    } else {
      const token = jwt.sign({ sub: barber.id, role: "BARBER" }, JWT_SECRET!, {
        expiresIn: "8h",
      });
      res.json({
        barber,
        msg: "Barber Signed In Successfully",
        token,
      });
    }
  } catch (error) {
    res.json({ msg: "Error happened during barber sign In" });
  }
});

router.post("/queue", authenticateJWT, async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const barberId = req.body.barberId; // Assuming barberId is sent in the request body

    // Fetch the queue entries, each including the user’s id & name
    const queue = await getQueue(barberId);

    // Return an array like:
    res.json(queue);
  } catch (err) {
    console.error("Error fetching barber queue:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
