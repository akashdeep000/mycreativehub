import bcrypt from "bcryptjs";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'toolkit.session',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Debug logging for session issues
  console.log("Auth check - Session exists:", !!req.session);
  console.log("Auth check - Session ID:", req.session?.id);
  console.log("Auth check - User ID in session:", req.session?.userId);
  
  if (req.session && req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        console.log("Auth check - User found:", user.email);
        req.user = user;
        return next();
      } else {
        console.log("Auth check - User not found for ID:", req.session.userId);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  } else {
    console.log("Auth check - No session or no userId in session");
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};

// Extend session interface
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: import("@shared/schema").User;
    }
  }
}