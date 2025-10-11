import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";
import dotenv from 'dotenv'

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use HTTP driver instead of WebSocket for better stability
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// For backward compatibility with existing code
export const pool = {
  query: sql,
  end: () => Promise.resolve(),
};