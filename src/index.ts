import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import barberRoutes from "./routes/barberRoutes";

const app = express();

// Simple CORS setup
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NextCut API is running",
    timestamp: new Date().toISOString(),
  });
});

// Your original routes
app.use("/user", userRoutes);
app.use("/barber", barberRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NextCut API listening on ${PORT}`));
