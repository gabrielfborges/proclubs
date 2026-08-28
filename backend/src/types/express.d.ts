import { AdminTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export {};
