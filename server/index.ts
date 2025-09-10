import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Environment variable validation
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  console.log("=== DEVELOPMENT ENVIRONMENT CHECK ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("DATABASE_URL available:", !!process.env.DATABASE_URL);
  console.log("SESSION_SECRET available:", !!process.env.SESSION_SECRET);
  console.log("JWT_SECRET available:", !!process.env.JWT_SECRET);
  const effectiveJwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  console.log("Effective JWT Secret available:", !!effectiveJwtSecret && effectiveJwtSecret !== "fallback-secret");
  console.log("APP_BASE_URL:", process.env.APP_BASE_URL || 'NOT SET');
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || 'NOT SET');
  console.log("=== DEVELOPMENT CHECK END ===");
} else {
  console.log("SERVER STARTING - Production Mode");
  console.log("APP_BASE_URL:", process.env.APP_BASE_URL || 'NOT SET');
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || 'NOT SET');
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy for proper session handling in deployment

// Force HTTPS but PRESERVE full path + query
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Temporary logging to track reset-password issues
app.use((req, res, next) => {
  if (req.originalUrl.includes('/reset-password')) {
    console.log(`[RESET-PASSWORD] ${req.method} ${req.originalUrl}`);
    console.log(`[RESET-PASSWORD] User-Agent: ${req.headers['user-agent']}`);
    console.log(`[RESET-PASSWORD] Host: ${req.headers.host}`);
    console.log(`[RESET-PASSWORD] X-Forwarded-Proto: ${req.headers['x-forwarded-proto']}`);
  }
  next();
});

// Health check endpoints - must be first to avoid middleware interference
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '3.1-deployment-ready',
  });
});

// CORS configuration for production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins for now - will be restrictive in production
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);



  // Final error handler - don't send JSON for non-API routes
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error', err);
    const status = err.status || err.statusCode || 500;
    
    if (req.path.startsWith('/api')) {
      res.status(status).json({ message: 'Internal Server Error' });
    } else {
      res.status(status).send('Something went wrong');
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDevMode = process.env.NODE_ENV === "development";
  console.log(`Server mode: ${isDevMode ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  
  if (isDevMode) {
    console.log('Setting up Vite development server...');
    await setupVite(app, server);
  } else {
    console.log('Setting up static file serving for production...');
    // Enhanced production static serving
    const path = require('path');
    const distPath = path.resolve(import.meta.dirname, "public");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // SPA fallback - serve index.html for ALL non-API routes (including reset-password)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        console.log(`[SPA FALLBACK] Serving index.html for: ${req.path}`);
        res.sendFile(path.resolve(distPath, "index.html"));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen({
    port: Number(port),
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server ready on port ${port}`);
  });
})();
