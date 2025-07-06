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

  // Get toolkit modules
  app.get('/api/toolkit-modules', isAuthenticated, async (req: any, res) => {
    try {
      const modules = await storage.getToolkitModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching toolkit modules:", error);
      res.status(500).json({ message: "Failed to fetch toolkit modules" });
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

  // Workflow Template Routes
  app.get("/api/workflow-templates", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/workflow-templates/archived", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const archivedTemplates = await storage.getArchivedWorkflowTemplateInstances(userId);
      res.json(archivedTemplates);
    } catch (error) {
      console.error("Error fetching archived templates:", error);
      res.status(500).json({ message: "Failed to fetch archived templates" });
    }
  });

  app.get("/api/workflow-templates/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/workflow-templates", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/workflow-templates/:id", isAuthenticated, async (req: any, res) => {
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



  app.post("/api/workflow-templates/:id/archive", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/workflow-templates/:id/restore", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/workflow-templates/bulk-delete", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/workflow-templates/:id", isAuthenticated, async (req: any, res) => {
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

  // Inspiration Boards API Routes
  app.get('/api/inspiration-boards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const boards = await storage.getInspirationBoards(userId);
      res.json(boards);
    } catch (error) {
      console.error("Error fetching inspiration boards:", error);
      res.status(500).json({ message: "Failed to fetch inspiration boards" });
    }
  });

  app.get('/api/inspiration-boards/archived', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const archivedBoards = await storage.getArchivedInspirationBoards(userId);
      res.json(archivedBoards);
    } catch (error) {
      console.error("Error fetching archived inspiration boards:", error);
      res.status(500).json({ message: "Failed to fetch archived inspiration boards" });
    }
  });

  app.get('/api/inspiration-boards/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title, description, backgroundColor, backgroundTexture } = req.body;
      
      if (!title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const board = await storage.createInspirationBoard({
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        backgroundColor: backgroundColor || "white",
        backgroundTexture: backgroundTexture || "paper",
      });
      
      res.status(201).json(board);
    } catch (error) {
      console.error("Error creating inspiration board:", error);
      res.status(500).json({ message: "Failed to create inspiration board" });
    }
  });

  app.patch('/api/inspiration-boards/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/duplicate', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/archive', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/restore', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/inspiration-boards/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/inspiration-boards/:id/images', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/images', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const image = await storage.createBoardImage({
        boardId: parseInt(id),
        ...req.body,
      });
      res.status(201).json(image);
    } catch (error) {
      console.error("Error creating board image:", error);
      res.status(500).json({ message: "Failed to create board image" });
    }
  });

  app.get('/api/inspiration-boards/:id/notes', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/notes', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/inspiration-boards/:id/palettes', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/palettes', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/inspiration-boards/:id/links', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inspiration-boards/:id/links', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/focus/log', isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
