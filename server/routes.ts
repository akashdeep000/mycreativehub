import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession } from "./customAuth";
import { generateToken, jwtAuth, hashPassword, comparePassword } from "./jwtAuth";
import { nanoid } from "nanoid";
import { insertDailyFocusTaskSchema, insertActivityLogSchema, insertUserTemplateInstanceSchema } from "@shared/schema";
import { db } from "./db";
import { inspirationBoards } from "@shared/schema";

// Helper function to update user stats on task completion
async function updateUserStatsOnTaskCompletion(userId: string) {
  try {
    // Get current stats
    let stats = await storage.getUserStats(userId);
    
    if (!stats) {
      // Create initial stats if they don't exist
      stats = await storage.updateUserStats(userId, {
        completedTasks: 1,
        focusHours: 0,
        daysShowedUp: 1,
        lastTaskCompletionDate: new Date(),
      });
    } else {
      // Update completed tasks count
      const newCompletedTasks = (stats.completedTasks || 0) + 1;
      
      // Calculate streak
      const today = new Date();
      const lastCompletion = stats.lastTaskCompletionDate ? new Date(stats.lastTaskCompletionDate) : null;
      let newStreak = stats.daysShowedUp || 0;
      
      if (lastCompletion) {
        const daysSinceLastCompletion = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastCompletion === 0) {
          // Same day, keep streak
          newStreak = stats.daysShowedUp || 1;
        } else if (daysSinceLastCompletion === 1) {
          // Next day, increment streak
          newStreak = (stats.daysShowedUp || 0) + 1;
        } else {
          // Gap in days, reset streak
          newStreak = 1;
        }
      } else {
        // First completion
        newStreak = 1;
      }
      
      // Update stats
      await storage.updateUserStats(userId, {
        completedTasks: newCompletedTasks,
        daysShowedUp: newStreak,
        lastTaskCompletionDate: today,
      });
    }
    
    console.log(`Updated stats for user ${userId}: tasks completed, streak calculated`);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for production debugging
  app.get('/api/health', (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret";
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasEffectiveJwtSecret: !!JWT_SECRET && JWT_SECRET !== "fallback-secret",
      jwtSecretSource: process.env.JWT_SECRET ? "JWT_SECRET" : process.env.SESSION_SECRET ? "SESSION_SECRET" : "fallback",
      deploymentVersion: "v3.0-forced",
    });
  });

  // Test endpoint to bypass authentication and test basic functionality
  app.get('/api/test-auth', (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret";
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const tokenFromCookie = req.cookies?.authToken;
    
    res.json({
      environment: process.env.NODE_ENV,
      jwtSecretAvailable: !!JWT_SECRET && JWT_SECRET !== "fallback-secret",
      jwtSecretSource: process.env.JWT_SECRET ? "JWT_SECRET" : process.env.SESSION_SECRET ? "SESSION_SECRET" : "fallback",
      hasAuthHeader: !!authHeader,
      hasTokenFromHeader: !!tokenFromHeader,
      hasTokenFromCookie: !!tokenFromCookie,
      tokenPreview: tokenFromHeader ? tokenFromHeader.substring(0, 20) + "..." : null,
      cookieTokenPreview: tokenFromCookie ? tokenFromCookie.substring(0, 20) + "..." : null,
      allCookies: Object.keys(req.cookies || {}),
    });
  });

  // Test board creation WITHOUT authentication to verify database connectivity
  app.post('/api/test-board-creation', async (req, res) => {
    try {
      console.log("=== TEST BOARD CREATION (NO AUTH) ===");
      console.log("Environment:", process.env.NODE_ENV);
      console.log("Database available:", !!process.env.DATABASE_URL);
      
      // Try to create a test board with a hardcoded user ID
      const testBoardData = {
        userId: "test-user-id",
        title: "Test Board",
        description: "Test board creation without auth",
      };
      
      console.log("Test - Attempting board creation with data:", testBoardData);
      
      const board = await storage.createInspirationBoard(testBoardData);
      console.log("Test - Board created successfully:", board.id);
      
      res.json({ 
        success: true, 
        boardId: board.id, 
        message: "Test board created successfully - database is working" 
      });
    } catch (error) {
      console.error("Test - Board creation failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: "Test board creation failed - database issue"
      });
    }
  });

  // Test authenticated board creation in production
  app.get('/api/test-production-auth', jwtAuth, async (req: any, res) => {
    try {
      console.log("=== PRODUCTION AUTH TEST ===");
      console.log("Environment:", process.env.NODE_ENV);
      console.log("User authenticated:", !!req.user);
      console.log("User ID:", req.user?.id);
      console.log("User email:", req.user?.email);
      
      res.json({
        success: true,
        authenticated: true,
        userId: req.user.id,
        userEmail: req.user.email,
        environment: process.env.NODE_ENV,
        message: "Authentication working in production"
      });
    } catch (error) {
      console.error("Production auth test error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Production auth test failed"
      });
    }
  });
  
  // Session middleware
  app.use(getSession());

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await storage.createUser({
        id: nanoid(),
        email,
        firstName,
        lastName,
        password: hashedPassword,
        authProvider: "custom"
      });
      
      // Generate JWT token
      console.log("Signup - Generating JWT token for user:", user.email);
      const token = generateToken(user.id, user.email);
      
      // Set httpOnly cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      console.log("Signup - JWT token generated and cookie set");
      
      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Sign-up error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log("Login - Starting authentication process");
      console.log("Login - Environment:", process.env.NODE_ENV);
      console.log("Login - Request body:", { email: req.body.email, hasPassword: !!req.body.password });
      
      const { email, password } = req.body;
      
      // Find user
      console.log("Login - Looking up user:", email);
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        console.log("Login - User not found or no password");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      console.log("Login - User found, checking password");
      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        console.log("Login - Password invalid");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Generate JWT token
      console.log("Login - Generating JWT token for user:", user.email);
      const token = generateToken(user.id, user.email);
      console.log("Login - JWT token generated, length:", token.length);
      console.log("Login - Token preview:", token.substring(0, 20) + "...");
      
      // Set httpOnly cookie
      console.log("Login - Setting httpOnly cookie");
      console.log("Login - Cookie secure flag:", process.env.NODE_ENV === 'production');
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      };
      console.log("Login - Cookie options:", JSON.stringify(cookieOptions, null, 2));
      res.cookie('authToken', token, cookieOptions);
      
      // ALSO store in localStorage as backup for production
      console.log("Login - Also providing token for localStorage storage");
      
      console.log("Login - JWT token generated and cookie set");
      
      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    console.log("Logout - Clearing auth token cookie");
    res.clearCookie('authToken');
    res.json({ message: "Logged out successfully" });
  });

  app.get('/api/auth/user', jwtAuth, async (req, res) => {
    try {
      console.log("Auth check - User from middleware:", req.user?.email);
      const user = req.user;
      if (!user) {
        console.log("Auth check - No user in middleware");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("Auth check - Recording dashboard access for user:", user.email);
      // Record dashboard access when user is authenticated
      await storage.recordDashboardAccess(user.id);
      
      console.log("Auth check - Returning user:", user.email);
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Toolkit modules
  app.get('/api/toolkit/modules', jwtAuth, async (req, res) => {
    try {
      const modules = await storage.getToolkitModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching toolkit modules:", error);
      res.status(500).json({ message: "Failed to fetch toolkit modules" });
    }
  });

  // Daily focus tasks
  app.get('/api/daily-focus/:date', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const date = new Date(req.params.date);
      const tasks = await storage.getDailyFocusTasks(userId, date);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching daily focus tasks:", error);
      res.status(500).json({ message: "Failed to fetch daily focus tasks" });
    }
  });

  app.post('/api/daily-focus', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskData = insertDailyFocusTaskSchema.parse({
        ...req.body,
        userId,
      });
      const task = await storage.createDailyFocusTask(taskData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'task_created',
        description: `Added new ${taskData.priority} task`,
        metadata: { taskId: task.id, priority: taskData.priority },
      });
      
      res.json(task);
    } catch (error) {
      console.error("Error creating daily focus task:", error);
      res.status(500).json({ message: "Failed to create daily focus task" });
    }
  });

  app.patch('/api/daily-focus/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.id);
      const { completed } = req.body;
      
      const task = await storage.updateDailyFocusTask(taskId, completed);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: completed ? 'task_completed' : 'task_uncompleted',
        description: completed ? 'Completed task' : 'Uncompleted task',
        metadata: { taskId: task.id, priority: task.priority },
      });
      
      // Update user stats when task is completed
      if (completed) {
        await updateUserStatsOnTaskCompletion(userId);
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating daily focus task:", error);
      res.status(500).json({ message: "Failed to update daily focus task" });
    }
  });

  // Activity log
  app.get('/api/activity', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivity(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // User stats
  app.get('/api/stats', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats || { completedTasks: 0, focusHours: 0, daysShowedUp: 0 });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Get toolkit modules
  app.get('/api/toolkit-modules', jwtAuth, async (req: any, res) => {
    try {
      const modules = await storage.getToolkitModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching toolkit modules:", error);
      res.status(500).json({ message: "Failed to fetch toolkit modules" });
    }
  });

  // Focus time tracking
  app.post('/api/focus/log', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { minutes, sessionType } = req.body;
      
      // Get current stats
      let stats = await storage.getUserStats(userId);
      const currentFocusHours = stats?.focusHours || 0;
      const newFocusHours = currentFocusHours + minutes;
      
      // Update focus hours
      if (!stats) {
        await storage.updateUserStats(userId, {
          completedTasks: 0,
          focusHours: newFocusHours,
          daysShowedUp: 0,
        });
      } else {
        await storage.updateUserStats(userId, {
          focusHours: newFocusHours,
        });
      }
      
      // Log the focus session activity
      await storage.createActivityLog({
        userId,
        action: 'focus_session',
        description: `Completed ${minutes} minute ${sessionType || 'focus'} session`,
        metadata: { duration: minutes, sessionType },
      });
      
      res.json({ success: true, totalFocusHours: newFocusHours });
    } catch (error) {
      console.error("Error logging focus time:", error);
      res.status(500).json({ message: "Failed to log focus time" });
    }
  });

  // Templates
  app.get('/api/templates/:moduleId', jwtAuth, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const templates = await storage.getTemplatesByModule(moduleId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // User template instances
  app.get('/api/user-templates', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const templateId = req.query.templateId ? parseInt(req.query.templateId as string) : undefined;
      const instances = await storage.getUserTemplateInstances(userId, templateId);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching user template instances:", error);
      res.status(500).json({ message: "Failed to fetch user template instances" });
    }
  });

  app.post('/api/user-templates', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const instanceData = insertUserTemplateInstanceSchema.parse({
        ...req.body,
        userId,
      });
      const instance = await storage.createUserTemplateInstance(instanceData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'template_created',
        description: `Created new template instance: ${instanceData.name}`,
        metadata: { templateId: instanceData.templateId },
      });
      
      res.json(instance);
    } catch (error) {
      console.error("Error creating user template instance:", error);
      res.status(500).json({ message: "Failed to create user template instance" });
    }
  });

  app.patch('/api/user-templates/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const instanceId = parseInt(req.params.id);
      const { data } = req.body;
      
      const instance = await storage.updateUserTemplateInstance(instanceId, data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'template_updated',
        description: `Updated template instance: ${instance.name}`,
        metadata: { templateId: instance.templateId },
      });
      
      res.json(instance);
    } catch (error) {
      console.error("Error updating user template instance:", error);
      res.status(500).json({ message: "Failed to update user template instance" });
    }
  });

  app.delete('/api/user-templates/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const instanceId = parseInt(req.params.id);
      
      await storage.deleteUserTemplateInstance(instanceId);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'template_deleted',
        description: 'Deleted template instance',
        metadata: { instanceId },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user template instance:", error);
      res.status(500).json({ message: "Failed to delete user template instance" });
    }
  });

  // Workflow Template Routes
  app.get("/api/workflow-templates", jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { templateType, includeArchived } = req.query;
      
      const templates = await storage.getWorkflowTemplateInstances(
        userId, 
        templateType as string, 
        includeArchived === 'true'
      );
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ message: "Failed to fetch workflow templates" });
    }
  });

  // Archive system routes - must come before generic :id route
  app.get("/api/workflow-templates/archived", jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const archivedTemplates = await storage.getArchivedWorkflowTemplateInstances(userId);
      res.json(archivedTemplates);
    } catch (error) {
      console.error("Error fetching archived templates:", error);
      res.status(500).json({ message: "Failed to fetch archived templates" });
    }
  });

  app.get("/api/workflow-templates/:id", jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getWorkflowTemplateInstance(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Check if user owns this template
      if (template.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching workflow template:", error);
      res.status(500).json({ message: "Failed to fetch workflow template" });
    }
  });

  app.post("/api/workflow-templates", jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { templateType, title, data } = req.body;
      
      const template = await storage.createWorkflowTemplateInstance({
        userId,
        templateType,
        title,
        data: data || {},
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating workflow template:", error);
      res.status(500).json({ message: "Failed to create workflow template" });
    }
  });

  app.put("/api/workflow-templates/:id", jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { data, title } = req.body;
      
      // Check if user owns this template
      const existingTemplate = await storage.getWorkflowTemplateInstance(parseInt(id));
      if (!existingTemplate || existingTemplate.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const template = await storage.updateWorkflowTemplateInstance(
        parseInt(id), 
        data, 
        title
      );
      
      res.json(template);
    } catch (error) {
      console.error("Error updating workflow template:", error);
      res.status(500).json({ message: "Failed to update workflow template" });
    }
  });



  app.post("/api/workflow-templates/:id/archive", jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if user owns this template
      const existingTemplate = await storage.getWorkflowTemplateInstance(parseInt(id));
      if (!existingTemplate || existingTemplate.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const template = await storage.archiveWorkflowTemplateInstance(parseInt(id));
      res.json(template);
    } catch (error) {
      console.error("Error archiving workflow template:", error);
      res.status(500).json({ message: "Failed to archive workflow template" });
    }
  });

  app.post("/api/workflow-templates/:id/restore", jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if user owns this template
      const existingTemplate = await storage.getWorkflowTemplateInstance(parseInt(id));
      if (!existingTemplate || existingTemplate.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const template = await storage.restoreWorkflowTemplateInstance(parseInt(id));
      res.json(template);
    } catch (error) {
      console.error("Error restoring workflow template:", error);
      res.status(500).json({ message: "Failed to restore workflow template" });
    }
  });

  app.post("/api/workflow-templates/bulk-delete", jwtAuth, async (req: any, res) => {
    try {
      const { templateIds } = req.body;
      
      if (!Array.isArray(templateIds) || templateIds.length === 0) {
        return res.status(400).json({ message: "Template IDs are required" });
      }
      
      // Verify user owns all templates
      for (const id of templateIds) {
        const template = await storage.getWorkflowTemplateInstance(parseInt(id));
        if (!template || template.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      await storage.bulkDeleteWorkflowTemplateInstances(templateIds.map(id => parseInt(id)));
      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting templates:", error);
      res.status(500).json({ message: "Failed to bulk delete templates" });
    }
  });

  app.delete("/api/workflow-templates/:id", jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if user owns this template
      const existingTemplate = await storage.getWorkflowTemplateInstance(parseInt(id));
      if (!existingTemplate || existingTemplate.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteWorkflowTemplateInstance(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow template:", error);
      res.status(500).json({ message: "Failed to delete workflow template" });
    }
  });

  // Initialize default toolkit modules if they don't exist
  app.post('/api/toolkit/initialize', jwtAuth, async (req, res) => {
    try {
      const modules = await storage.getToolkitModules();
      if (modules.length === 0) {
        // Initialize default modules - in a real app, this would be done via migration
        // For now, we'll just return an empty array
        res.json([]);
      } else {
        res.json(modules);
      }
    } catch (error) {
      console.error("Error initializing toolkit modules:", error);
      res.status(500).json({ message: "Failed to initialize toolkit modules" });
    }
  });

  // Debug endpoint to check environment
  app.get('/api/debug/environment', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const boards = await storage.getInspirationBoards(userId);
      res.json({
        environment: process.env.NODE_ENV,
        userId,
        dbConnected: true,
        existingBoards: boards.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug - Environment check failed:", error);
      res.status(500).json({ 
        environment: process.env.NODE_ENV,
        userId: req.user?.id,
        dbConnected: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Inspiration Boards API Routes
  app.get('/api/inspiration-boards', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const boards = await storage.getInspirationBoards(userId);
      res.json(boards);
    } catch (error) {
      console.error("Error fetching inspiration boards:", error);
      res.status(500).json({ message: "Failed to fetch inspiration boards" });
    }
  });

  app.get('/api/inspiration-boards/archived', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const archivedBoards = await storage.getArchivedInspirationBoards(userId);
      res.json(archivedBoards);
    } catch (error) {
      console.error("Error fetching archived inspiration boards:", error);
      res.status(500).json({ message: "Failed to fetch archived inspiration boards" });
    }
  });

  app.get('/api/inspiration-boards/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      // Verify ownership
      if (board.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(board);
    } catch (error) {
      console.error("Error fetching inspiration board:", error);
      res.status(500).json({ message: "Failed to fetch inspiration board" });
    }
  });

  app.post('/api/inspiration-boards', jwtAuth, async (req: any, res) => {
    try {
      console.log("=== BOARD CREATION START ===");
      console.log("PRODUCTION DEBUG - Environment:", process.env.NODE_ENV);
      console.log("PRODUCTION DEBUG - Request method:", req.method);
      console.log("PRODUCTION DEBUG - Request URL:", req.url);
      console.log("PRODUCTION DEBUG - Request headers:", JSON.stringify(req.headers, null, 2));
      console.log("PRODUCTION DEBUG - Request body:", JSON.stringify(req.body, null, 2));
      console.log("PRODUCTION DEBUG - Database URL available:", !!process.env.DATABASE_URL);
      console.log("PRODUCTION DEBUG - Database URL preview:", process.env.DATABASE_URL?.substring(0, 50) + "...");
      
      // Validate authentication
      if (!req.user || !req.user.id) {
        console.log("PRODUCTION DEBUG - AUTH ERROR: No user found in request");
        console.log("PRODUCTION DEBUG - req.user:", req.user);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      console.log("PRODUCTION DEBUG - Creating inspiration board - User ID:", userId);
      console.log("PRODUCTION DEBUG - User object:", JSON.stringify(req.user, null, 2));
      
      const { title, description, backgroundColor, backgroundTexture } = req.body;
      
      if (!title?.trim()) {
        console.log("VALIDATION ERROR: Title validation failed");
        return res.status(400).json({ message: "Title is required" });
      }
      
      const boardData = {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        backgroundColor: backgroundColor || "white",
        backgroundTexture: backgroundTexture || "paper",
      };
      
      console.log("PRODUCTION DEBUG - Creating inspiration board - Board data:", JSON.stringify(boardData, null, 2));
      
      // Test database connection
      console.log("PRODUCTION DEBUG - Testing database connection...");
      try {
        const existingBoards = await storage.getInspirationBoards(userId);
        console.log("PRODUCTION DEBUG - Database connection successful, existing boards count:", existingBoards.length);
      } catch (dbError) {
        console.error("PRODUCTION DEBUG - DATABASE CONNECTION ERROR:", dbError);
        console.error("PRODUCTION DEBUG - DB Error type:", typeof dbError);
        console.error("PRODUCTION DEBUG - DB Error message:", dbError instanceof Error ? dbError.message : 'Unknown error');
        console.error("PRODUCTION DEBUG - DB Error stack:", dbError instanceof Error ? dbError.stack : 'No stack');
        return res.status(500).json({ message: "Database connection failed" });
      }
      
      console.log("PRODUCTION DEBUG - About to create board...");
      const board = await storage.createInspirationBoard(boardData);
      console.log("PRODUCTION DEBUG - Board created successfully:", JSON.stringify(board, null, 2));
      console.log("PRODUCTION DEBUG - Board ID:", board.id);
      console.log("=== BOARD CREATION SUCCESS ===");
      
      res.status(201).json(board);
    } catch (error: any) {
      console.error("=== BOARD CREATION ERROR ===");
      console.error("PRODUCTION DEBUG - Error creating inspiration board:", error);
      console.error("PRODUCTION DEBUG - Error type:", typeof error);
      console.error("PRODUCTION DEBUG - Error name:", error?.name);
      console.error("PRODUCTION DEBUG - Error message:", error?.message);
      console.error("PRODUCTION DEBUG - Error stack:", error?.stack);
      console.error("PRODUCTION DEBUG - Error code:", error?.code);
      console.error("PRODUCTION DEBUG - Error errno:", error?.errno);
      console.error("PRODUCTION DEBUG - Error details:", {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        errno: error?.errno,
        userId: req.user?.id,
        requestBody: req.body,
        environment: process.env.NODE_ENV,
        databaseUrl: !!process.env.DATABASE_URL,
        pgUser: !!process.env.PGUSER,
        pgDatabase: !!process.env.PGDATABASE
      });
      console.error("PRODUCTION DEBUG - Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("=== BOARD CREATION ERROR END ===");
      res.status(500).json({ 
        message: "Failed to create inspiration board",
        error: error?.message,
        errorCode: error?.code,
        debug: process.env.NODE_ENV === 'production' ? 'Check server logs for details' : error.message
      });
    }
  });

  app.patch('/api/inspiration-boards/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedBoard = await storage.updateInspirationBoard(parseInt(id), req.body);
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error updating inspiration board:", error);
      res.status(500).json({ message: "Failed to update inspiration board" });
    }
  });

  app.post('/api/inspiration-boards/:id/duplicate', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const duplicatedBoard = await storage.duplicateInspirationBoard(parseInt(id), userId);
      res.status(201).json(duplicatedBoard);
    } catch (error) {
      console.error("Error duplicating inspiration board:", error);
      res.status(500).json({ message: "Failed to duplicate inspiration board" });
    }
  });

  app.post('/api/inspiration-boards/:id/archive', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const archivedBoard = await storage.archiveInspirationBoard(parseInt(id));
      res.json(archivedBoard);
    } catch (error) {
      console.error("Error archiving inspiration board:", error);
      res.status(500).json({ message: "Failed to archive inspiration board" });
    }
  });

  app.post('/api/inspiration-boards/:id/restore', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const restoredBoard = await storage.restoreInspirationBoard(parseInt(id));
      res.json(restoredBoard);
    } catch (error) {
      console.error("Error restoring inspiration board:", error);
      res.status(500).json({ message: "Failed to restore inspiration board" });
    }
  });

  app.delete('/api/inspiration-boards/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteInspirationBoard(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inspiration board:", error);
      res.status(500).json({ message: "Failed to delete inspiration board" });
    }
  });

  // Board content routes - Images, Notes, Palettes, Links
  app.get('/api/inspiration-boards/:id/images', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const images = await storage.getBoardImages(parseInt(id));
      res.json(images);
    } catch (error) {
      console.error("Error fetching board images:", error);
      res.status(500).json({ message: "Failed to fetch board images" });
    }
  });

  app.post('/api/inspiration-boards/:id/images', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log("Creating board image for board ID:", id);
      console.log("Request body:", req.body);
      
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        console.log("Board not found or access denied:", { boardExists: !!board, userId: req.user.id });
        return res.status(404).json({ message: "Board not found" });
      }
      
      const image = await storage.createBoardImage({
        boardId: parseInt(id),
        ...req.body,
      });
      console.log("Image created successfully:", image);
      res.status(201).json(image);
    } catch (error) {
      console.error("Error creating board image:", error);
      res.status(500).json({ message: "Failed to create board image" });
    }
  });

  app.put('/api/inspiration-boards/:id/images/:imageId', jwtAuth, async (req: any, res) => {
    try {
      const { id, imageId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const image = await storage.updateBoardImage(parseInt(imageId), req.body);
      res.json(image);
    } catch (error) {
      console.error("Error updating board image:", error);
      res.status(500).json({ message: "Failed to update board image" });
    }
  });

  app.get('/api/inspiration-boards/:id/notes', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const notes = await storage.getBoardNotes(parseInt(id));
      res.json(notes);
    } catch (error) {
      console.error("Error fetching board notes:", error);
      res.status(500).json({ message: "Failed to fetch board notes" });
    }
  });

  app.post('/api/inspiration-boards/:id/notes', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const note = await storage.createBoardNote({
        boardId: parseInt(id),
        ...req.body,
      });
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating board note:", error);
      res.status(500).json({ message: "Failed to create board note" });
    }
  });

  app.get('/api/inspiration-boards/:id/palettes', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const palettes = await storage.getBoardColorPalettes(parseInt(id));
      res.json(palettes);
    } catch (error) {
      console.error("Error fetching board palettes:", error);
      res.status(500).json({ message: "Failed to fetch board palettes" });
    }
  });

  app.post('/api/inspiration-boards/:id/palettes', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const palette = await storage.createColorPalette({
        boardId: parseInt(id),
        ...req.body,
      });
      res.status(201).json(palette);
    } catch (error) {
      console.error("Error creating color palette:", error);
      res.status(500).json({ message: "Failed to create color palette" });
    }
  });

  app.get('/api/inspiration-boards/:id/links', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const links = await storage.getBoardLinks(parseInt(id));
      res.json(links);
    } catch (error) {
      console.error("Error fetching board links:", error);
      res.status(500).json({ message: "Failed to fetch board links" });
    }
  });

  app.post('/api/inspiration-boards/:id/links', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const link = await storage.createBoardLink({
        boardId: parseInt(id),
        ...req.body,
      });
      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating board link:", error);
      res.status(500).json({ message: "Failed to create board link" });
    }
  });

  // Focus session logging
  app.post('/api/focus/log', jwtAuth, async (req: any, res) => {
    try {
      const { minutes, sessionType, taskDescription } = req.body;
      const userId = req.user.id;
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: `Completed ${minutes} minute focus session`,
        type: 'focus',
        metadata: { sessionType, taskDescription, minutes }
      });
      
      // Update user stats
      const currentStats = await storage.getUserStats(userId);
      const currentFocusHours = currentStats?.focusHours || 0;
      
      await storage.updateUserStats(userId, {
        focusHours: currentFocusHours + minutes
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error logging focus session:", error);
      res.status(500).json({ message: "Failed to log focus session" });
    }
  });

  // Social Media Strategy routes
  app.get('/api/social-media-strategy', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const strategy = await storage.getSocialMediaStrategy(userId);
      res.json(strategy);
    } catch (error) {
      console.error("Error fetching social media strategy:", error);
      res.status(500).json({ message: "Failed to fetch social media strategy" });
    }
  });

  app.post('/api/social-media-strategy', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contentGoals, pillars } = req.body;
      
      const strategy = await storage.upsertSocialMediaStrategy({
        userId,
        contentGoals,
        pillars
      });
      
      res.json(strategy);
    } catch (error) {
      console.error("Error saving social media strategy:", error);
      res.status(500).json({ message: "Failed to save social media strategy" });
    }
  });

  // Resource Library routes
  app.get('/api/resource-library', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const items = await storage.getResourceLibraryItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching resource library items:", error);
      res.status(500).json({ message: "Failed to fetch resource library items" });
    }
  });

  app.post('/api/resource-library', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const itemData = {
        userId,
        ...req.body
      };
      
      const item = await storage.createResourceLibraryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating resource library item:", error);
      res.status(500).json({ message: "Failed to create resource library item" });
    }
  });

  app.put('/api/resource-library/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const item = await storage.updateResourceLibraryItem(parseInt(id), req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating resource library item:", error);
      res.status(500).json({ message: "Failed to update resource library item" });
    }
  });

  app.delete('/api/resource-library/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResourceLibraryItem(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resource library item:", error);
      res.status(500).json({ message: "Failed to delete resource library item" });
    }
  });

  app.post('/api/resource-library/reorder', jwtAuth, async (req: any, res) => {
    try {
      const { items } = req.body;
      await storage.updateResourceDisplayOrder(items);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering resource library items:", error);
      res.status(500).json({ message: "Failed to reorder resource library items" });
    }
  });

  // Affiliate Links routes
  app.get('/api/affiliate-links', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const links = await storage.getAffiliateLinks(userId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching affiliate links:", error);
      res.status(500).json({ message: "Failed to fetch affiliate links" });
    }
  });

  app.post('/api/affiliate-links', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Map frontend fields to database schema
      const linkData = {
        userId,
        productName: req.body.productName,
        companyName: req.body.company, // frontend sends 'company', db expects 'companyName'
        trackingLink: req.body.affiliateLink, // frontend sends 'affiliateLink', db expects 'trackingLink'
        affiliateCode: req.body.trackingCode, // frontend sends 'trackingCode', db expects 'affiliateCode'
        commissionRate: req.body.commissionRate,
        cookieLength: req.body.cookieLength,
        contentChannel: req.body.contentChannels?.join(', '), // frontend sends array, db expects string
        notes: req.body.notes,
        status: req.body.status
      };
      
      const link = await storage.createAffiliateLink(linkData);
      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating affiliate link:", error);
      res.status(500).json({ message: "Failed to create affiliate link" });
    }
  });

  app.put('/api/affiliate-links/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Map frontend fields to database schema
      const updateData = {
        productName: req.body.productName,
        companyName: req.body.company, // frontend sends 'company', db expects 'companyName'
        trackingLink: req.body.affiliateLink, // frontend sends 'affiliateLink', db expects 'trackingLink'
        affiliateCode: req.body.trackingCode, // frontend sends 'trackingCode', db expects 'affiliateCode'
        commissionRate: req.body.commissionRate,
        cookieLength: req.body.cookieLength,
        contentChannel: req.body.contentChannels?.join(', '), // frontend sends array, db expects string
        notes: req.body.notes,
        status: req.body.status
      };
      
      const link = await storage.updateAffiliateLink(parseInt(id), updateData);
      res.json(link);
    } catch (error) {
      console.error("Error updating affiliate link:", error);
      res.status(500).json({ message: "Failed to update affiliate link" });
    }
  });

  app.delete('/api/affiliate-links/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAffiliateLink(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting affiliate link:", error);
      res.status(500).json({ message: "Failed to delete affiliate link" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
