import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession, isAuthenticated, hashPassword, comparePassword } from "./customAuth";
import { nanoid } from "nanoid";
import { insertDailyFocusTaskSchema, insertActivityLogSchema, insertUserTemplateInstanceSchema } from "@shared/schema";

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
      
      // Create session
      req.session.userId = user.id;
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Sign-up error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session
      req.session.userId = user.id;
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Record dashboard access when user is authenticated
      await storage.recordDashboardAccess(user.id);
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Toolkit modules
  app.get('/api/toolkit/modules', isAuthenticated, async (req, res) => {
    try {
      const modules = await storage.getToolkitModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching toolkit modules:", error);
      res.status(500).json({ message: "Failed to fetch toolkit modules" });
    }
  });

  // Daily focus tasks
  app.get('/api/daily-focus/:date', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/daily-focus', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/daily-focus/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats || { completedTasks: 0, focusHours: 0, daysShowedUp: 0 });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Focus time tracking
  app.post('/api/focus/log', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/templates/:moduleId', isAuthenticated, async (req, res) => {
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
  app.get('/api/user-templates', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/user-templates', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/user-templates/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/user-templates/:id', isAuthenticated, async (req: any, res) => {
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

  // Initialize default toolkit modules if they don't exist
  app.post('/api/toolkit/initialize', isAuthenticated, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
