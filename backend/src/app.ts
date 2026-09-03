import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import championshipRoutes from "./routes/championships.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.set("trust proxy", process.env.TRUST_PROXY === "true");

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/championships", championshipRoutes);

  app.use(errorHandler);

  return app;
}
