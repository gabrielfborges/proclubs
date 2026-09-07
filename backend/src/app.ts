import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import championshipRoutes from "./routes/championships.routes";
import paymentRoutes from "./routes/payments.routes";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./prisma";

export function createApp() {
  const app = express();
  app.set("trust proxy", process.env.TRUST_PROXY === "true");

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({
        status: "ok",
        database: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health check do banco falhou.", error);
      return res.status(503).json({
        status: "degraded",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/championships", championshipRoutes);
  app.use("/api/payments", paymentRoutes);

  app.use(errorHandler);

  return app;
}
