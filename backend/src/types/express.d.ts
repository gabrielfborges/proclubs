import { UserTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

export {};