import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";

import barberRoutes from "./routes/barberRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);
app.use("/barber", barberRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NextCut API listening on ${PORT}`));
