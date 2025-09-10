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
  console.log("=== DEVELOPMENT CHECK END ===");
} else {
  console.log("SERVER STARTING - Production Mode");
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy for proper session handling in deployment

// HTTPS redirect middleware - preserves full URL including query parameters
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Debug logging for reset-password requests to track mobile issues
app.use((req, res, next) => {
  if (req.originalUrl.includes('/reset-password')) {
    console.log(`[RESET PASSWORD DEBUG] ${req.method} ${req.originalUrl} - User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // In production, don't expose sensitive error details
    if (process.env.NODE_ENV === 'production') {
      console.error('Production error:', err);
      res.status(status).json({ 
        message: status >= 500 ? "Internal Server Error" : message,
        status: status 
      });
    } else {
      res.status(status).json({ message, stack: err.stack });
    }
  });

  // SPA fallback middleware - handle deep links for mobile and desktop
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Skip static files (anything with a file extension except for SPA routes)
    if (req.path.includes('.') && 
        !req.path.includes('/reset-password') && 
        !req.path.includes('/login') && 
        !req.path.includes('/dashboard')) {
      return next();
    }
    
    console.log(`[SPA FALLBACK] Handling deep link: ${req.originalUrl}`);
    
    // In production, serve the built index.html
    if (process.env.NODE_ENV === 'production') {
      const path = require('path');
      const fs = require('fs');
      const indexPath = path.resolve(process.cwd(), 'server/public/index.html');
      
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      } else {
        console.error('Production index.html not found at:', indexPath);
        return res.status(404).send('Index file not found');
      }
    }
    
    // In development, let Vite handle it
    next();
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
    serveStatic(app);
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
