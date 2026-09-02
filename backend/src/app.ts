import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import championshipRoutes from "./routes/championships.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    })
  );
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok", release: "ea-reader-fallback" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/championships", championshipRoutes);

  app.use(errorHandler);

  return app;
}
