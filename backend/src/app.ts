import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import championshipRoutes from "./routes/championships.routes";
import { errorHandler } from "./middleware/errorHandler";
import { searchEaClubs } from "./services/ea-clubs.service";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    })
  );
  app.use(express.json());

  app.get("/api/health", async (req, res) => {
    const health = { status: "ok", release: "ea-reader-fallback" };
    if (req.query.ea !== "1") return res.json(health);

    try {
      const name = typeof req.query.name === "string" ? req.query.name : "narizes";
      const clubs = await searchEaClubs(name);
      return res.json({ ...health, ea: { status: "ok", count: clubs.length, clubs: clubs.slice(0, 3) } });
    } catch (error) {
      return res.status(502).json({
        ...health,
        ea: { status: "error", message: error instanceof Error ? error.message : String(error) },
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/championships", championshipRoutes);

  app.use(errorHandler);

  return app;
}
