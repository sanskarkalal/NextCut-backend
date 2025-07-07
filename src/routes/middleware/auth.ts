import { lowercase } from "./../../../node_modules/zod/src/v4/core/regexes";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";
const JWT_SECRET = process.env.JWT_SECRET!;

export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return; // <-- void
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("JWT payload:", payload);
    console.log("PAssed JWT auth middleware");
    next(); // <-- still void
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
