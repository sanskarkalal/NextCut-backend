import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

console.log("=== ENVIRONMENT DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT from env:", process.env.PORT);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("========================");

// Simple CORS allowing your frontend
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

// Health check
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

// In-memory storage for testing (will be reset on restart)
const users: any[] = [];
const barbers: any[] = [];

// User signup - no database, just in-memory
app.post("/user/signup", (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Signup request:", { name, email, hasPassword: !!password });

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }

    // Check if user already exists
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create user (in memory)
    const user = {
      id: users.length + 1,
      name,
      email,
      password, // In real app, this would be hashed
    };

    users.push(user);

    console.log("User created:", { id: user.id, email: user.email });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
      token: `mock-token-${user.id}`,
      msg: "User created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      msg: "Error occurred during sign up",
      error: String(error),
    });
  }
});

// User signin - no database, just in-memory
app.post("/user/signin", (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Signin request:", { email, hasPassword: !!password });

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      console.log("Authentication failed for:", email);
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    console.log("Authentication successful for:", email);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: `mock-token-${user.id}`,
      msg: "User Signed In Successfully",
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      msg: "Error occurred during sign in",
      error: String(error),
    });
  }
});

// Barber signup
app.post("/barber/signup", (req, res) => {
  try {
    const { name, username, password, lat, long } = req.body;

    console.log("Barber signup request:", { name, username, lat, long });

    if (!name || !username || !password || !lat || !long) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if barber already exists
    const existingBarber = barbers.find((b) => b.username === username);
    if (existingBarber) {
      return res.status(409).json({ msg: "Username already exists" });
    }

    // Create barber (in memory)
    const barber = {
      id: barbers.length + 1,
      name,
      username,
      password,
      lat: parseFloat(lat),
      long: parseFloat(long),
    };

    barbers.push(barber);

    console.log("Barber created:", {
      id: barber.id,
      username: barber.username,
    });

    res.status(201).json({
      barber: {
        id: barber.id,
        name: barber.name,
        username: barber.username,
        lat: barber.lat,
        long: barber.long,
      },
      token: `mock-barber-token-${barber.id}`,
      msg: "Barber Created Successfully",
    });
  } catch (error) {
    console.error("Barber signup error:", error);
    res.status(500).json({
      msg: "Error occurred during barber signup",
      error: String(error),
    });
  }
});

// Barber signin
app.post("/barber/signin", (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("Barber signin request:", {
      username,
      hasPassword: !!password,
    });

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Find barber
    const barber = barbers.find(
      (b) => b.username === username && b.password === password
    );

    if (!barber) {
      console.log("Barber authentication failed for:", username);
      return res.status(401).json({ msg: "Invalid username or password" });
    }

    console.log("Barber authentication successful for:", username);

    res.json({
      barber: {
        id: barber.id,
        name: barber.name,
        username: barber.username,
        lat: barber.lat,
        long: barber.long,
      },
      token: `mock-barber-token-${barber.id}`,
      msg: "Barber Signed In Successfully",
    });
  } catch (error) {
    console.error("Barber signin error:", error);
    res.status(500).json({
      msg: "Error occurred during barber sign in",
      error: String(error),
    });
  }
});

// Debug endpoint
app.get("/debug", (req, res) => {
  res.json({
    origin: req.headers.origin,
    environment: process.env.NODE_ENV,
    usersCount: users.length,
    barbersCount: barbers.length,
    timestamp: new Date().toISOString(),
    users: users.map((u) => ({ id: u.id, email: u.email })), // Don't expose passwords
  });
});

const PORT = process.env.PORT || 3000;

console.log("Attempting to start server on 0.0.0.0:" + PORT);
app.listen(PORT, () => {
  console.log(`✅ Server successfully listening on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
