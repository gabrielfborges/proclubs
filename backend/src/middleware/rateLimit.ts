import { Request, Response, NextFunction } from "express";
type Counter = { count: number; resetAt: number };
const counters = new Map<string, Counter>();
export function rateLimit(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip ?? "unknown"}:${req.path}`;
    const now = Date.now();
    const current = counters.get(key);
    const counter = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    counter.count += 1;
    counters.set(key, counter);
    if (counter.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((counter.resetAt - now) / 1000));
      return res.status(429).json({ message: options.message });
    }
    return next();
  };
}
