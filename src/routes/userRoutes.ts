import express, { Request, Response } from "express";

import {
  createUser,
  authenticateUser,
  joinQueue,
} from "../services/userServices";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { authenticateJWT } from "./middleware/auth";

const userRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// GET /user/
userRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required." });
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
    res.json({ msg: "Error occurred during sign up" });
  }
});

userRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required." });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    res.json({ msg: "You do not have an account" });
  } else {
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET!, {
      expiresIn: "8h",
    });

    res.json({
      user,
      msg: "User Signed In Successfully",
      token,
    });
  }
});

userRouter.post(
  "/joinqueue",
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { userId, barberId, name } = req.body;

    const body = await joinQueue(barberId, userId);
    // console.log("body", body);
    res.json({
      msg: "You have joined the queue",
      queue: body,
    });
  }
);

export default userRouter;
