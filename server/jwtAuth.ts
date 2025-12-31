import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret";
// Use longer expiration for preview environment to handle timing issues
const JWT_EXPIRES_IN = process.env.NODE_ENV === 'production' ? "7d" : "30d";

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function generateToken(userId: string, email: string): string {
  console.log("JWT Generate - Creating token for user:", email);
  console.log("JWT Generate - Environment:", process.env.NODE_ENV);
  console.log("JWT Generate - JWT_SECRET available:", !!JWT_SECRET);
  console.log("JWT Generate - JWT_SECRET length:", JWT_SECRET.length);

  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  console.log("JWT Generate - Token created, length:", token.length);
  console.log("JWT Generate - Token preview:", token.substring(0, 30) + "...");

  return token;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    console.log("JWT Verify - Verifying token");
    console.log("JWT Verify - Environment:", process.env.NODE_ENV);
    console.log("JWT Verify - JWT_SECRET available:", !!JWT_SECRET);
    console.log("JWT Verify - Token length:", token.length);
    console.log("JWT Verify - Token preview:", token.substring(0, 30) + "...");

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log("JWT Verify - Token verified successfully for user:", decoded.email);
    console.log("JWT Verify - Token payload:", JSON.stringify(decoded, null, 2));

    return decoded;
  } catch (error) {
    console.error("JWT Verify - Token verification failed");
    console.error("JWT Verify - Error:", error);
    console.error("JWT Verify - Error type:", typeof error);
    console.error("JWT Verify - Error message:", error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const jwtAuth: RequestHandler = async (req, res, next) => {
  try {
    console.log("=== JWT AUTH START ===");
    console.log("JWT Auth - Environment:", process.env.NODE_ENV);
    console.log("JWT Auth - Request URL:", req.url);
    console.log("JWT Auth - Request method:", req.method);
    console.log("JWT Auth - Checking authentication");

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Check for token in cookies
    const cookieToken = req.cookies?.authToken;

    const token = headerToken || cookieToken;

    console.log("JWT Auth - Token found:", !!token);
    console.log("JWT Auth - Token source:", headerToken ? "header" : cookieToken ? "cookie" : "none");
    console.log("JWT Auth - Auth header present:", !!authHeader);
    console.log("JWT Auth - Cookie token present:", !!cookieToken);
    console.log("JWT Auth - Available cookies:", Object.keys(req.cookies || {}));

    if (!token) {
      console.log("JWT Auth - No token provided");
      console.log("=== JWT AUTH FAILED (NO TOKEN) ===");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log("JWT Auth - Invalid token");
      console.log("JWT Auth - Token length:", token.length);
      console.log("JWT Auth - Token preview:", token.substring(0, 20) + "...");
      console.log("=== JWT AUTH FAILED (INVALID TOKEN) ===");
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("JWT Auth - Token valid for user:", decoded.email);
    console.log("JWT Auth - User ID from token:", decoded.userId);

    // Fetch user from database
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log("JWT Auth - User not found for ID:", decoded.userId);
      console.log("=== JWT AUTH FAILED (USER NOT FOUND) ===");
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("JWT Auth - User authenticated:", user.email);

    // Check if user's email is still whitelisted
    // We allow /api/subscription routes so they can see their status even if access is removed
    const isSubscriptionRoute = req.url.startsWith('/api/subscription');
    if (!isSubscriptionRoute) {
      const isWhitelisted = await storage.isEmailWhitelisted(user.email);
      if (!isWhitelisted) {
        console.log("JWT Auth - User not whitelisted:", user.email);
        console.log("=== JWT AUTH FAILED (NOT WHITELISTED) ===");
        return res.status(403).json({
          message: "Access is restricted to course members only.",
          accessDenied: true
        });
      }
    }

    req.user = user;
    console.log("=== JWT AUTH SUCCESS ===");
    next();
  } catch (error) {
    console.error("=== JWT AUTH ERROR ===");
    console.error("JWT Auth - Error:", error);
    console.error("JWT Auth - Error type:", typeof error);
    console.error("JWT Auth - Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("=== JWT AUTH ERROR END ===");
    res.status(401).json({ message: "Unauthorized" });
  }
};