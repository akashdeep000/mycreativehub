import {
  users,
  toolkitModules,
  userToolkitData,
  dailyFocusTasks,
  taskCompletionLog,
  activityLog,
  userStats,
  templates,
  userTemplateInstances,
  dashboardAccess,
  workflowTemplateInstances,
  workflowTemplateFiles,
  inspirationBoards,
  inspirationBoardImages,
  inspirationBoardNotes,
  colorPalettes,
  boardLinks,
  socialMediaStrategies,
  resourceLibrary,
  affiliateLinks,
  type User,
  type UpsertUser,
  type ToolkitModule,
  type UserToolkitData,
  type DailyFocusTask,
  type InsertDailyFocusTask,
  type TaskCompletionLog,
  type InsertTaskCompletionLog,
  type ActivityLog,
  type InsertActivityLog,
  type UserStats,
  type Template,
  type UserTemplateInstance,
  type InsertUserTemplateInstance,
  type WorkflowTemplateInstance,
  type InsertWorkflowTemplateInstance,
  type WorkflowTemplateFile,
  type InsertWorkflowTemplateFile,
  type InspirationBoard,
  type InsertInspirationBoard,
  type InspirationBoardImage,
  type InsertInspirationBoardImage,
  type InspirationBoardNote,
  type InsertInspirationBoardNote,
  type ColorPalette,
  type InsertColorPalette,
  type BoardLink,
  type InsertBoardLink,
  type SocialMediaStrategy,
  type InsertSocialMediaStrategy,
  type ResourceLibraryItem,
  type InsertResourceLibraryItem,
  type AffiliateLink,
  type InsertAffiliateLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - supports both Replit Auth and custom auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  
  // Toolkit modules
  getToolkitModules(): Promise<ToolkitModule[]>;
  getUserToolkitData(userId: string, moduleId: number): Promise<UserToolkitData | undefined>;
  upsertUserToolkitData(data: any): Promise<UserToolkitData>;
  
  // Daily focus tasks
  getDailyFocusTasks(userId: string, date: Date): Promise<DailyFocusTask[]>;
  createDailyFocusTask(task: InsertDailyFocusTask): Promise<DailyFocusTask>;
  updateDailyFocusTask(id: number, completed: boolean): Promise<DailyFocusTask>;
  clearDailyFocusTasks(userId: string, date: Date): Promise<void>;
  
  // Task completion log
  logTaskCompletion(log: InsertTaskCompletionLog): Promise<TaskCompletionLog>;
  getMonthlyTaskCompletions(userId: string, year: number, month: number): Promise<number>;
  
  // Activity log
  getRecentActivity(userId: string, limit: number): Promise<ActivityLog[]>;
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;
  
  // User stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats>;
  
  // Dashboard access tracking
  recordDashboardAccess(userId: string): Promise<void>;
  getMonthlyDashboardAccess(userId: string, month: string): Promise<number>;
  
  // Templates
  getTemplatesByModule(moduleId: number): Promise<Template[]>;
  getUserTemplateInstances(userId: string, templateId?: number): Promise<UserTemplateInstance[]>;
  createUserTemplateInstance(instance: InsertUserTemplateInstance): Promise<UserTemplateInstance>;
  updateUserTemplateInstance(id: number, data: any): Promise<UserTemplateInstance>;
  deleteUserTemplateInstance(id: number): Promise<void>;
  
  // Workflow Templates
  getWorkflowTemplateInstances(userId: string, templateType?: string, includeArchived?: boolean): Promise<WorkflowTemplateInstance[]>;
  getArchivedWorkflowTemplateInstances(userId: string): Promise<WorkflowTemplateInstance[]>;
  getWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance | undefined>;
  createWorkflowTemplateInstance(instance: InsertWorkflowTemplateInstance): Promise<WorkflowTemplateInstance>;
  updateWorkflowTemplateInstance(id: number, data: any, title?: string): Promise<WorkflowTemplateInstance>;
  archiveWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance>;
  restoreWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance>;
  deleteWorkflowTemplateInstance(id: number): Promise<void>;
  bulkDeleteWorkflowTemplateInstances(ids: number[]): Promise<void>;
  
  // Workflow Template Files
  getWorkflowTemplateFiles(templateInstanceId: number): Promise<WorkflowTemplateFile[]>;
  createWorkflowTemplateFile(file: InsertWorkflowTemplateFile): Promise<WorkflowTemplateFile>;
  deleteWorkflowTemplateFile(id: number): Promise<void>;
  
  // Inspiration Boards
  getInspirationBoards(userId: string, includeArchived?: boolean): Promise<InspirationBoard[]>;
  getArchivedInspirationBoards(userId: string): Promise<InspirationBoard[]>;
  getInspirationBoard(id: number): Promise<InspirationBoard | undefined>;
  createInspirationBoard(board: InsertInspirationBoard): Promise<InspirationBoard>;
  updateInspirationBoard(id: number, data: any): Promise<InspirationBoard>;
  duplicateInspirationBoard(id: number, userId: string): Promise<InspirationBoard>;
  archiveInspirationBoard(id: number): Promise<InspirationBoard>;
  restoreInspirationBoard(id: number): Promise<InspirationBoard>;
  deleteInspirationBoard(id: number): Promise<void>;
  
  // Inspiration Board Images
  getBoardImages(boardId: number): Promise<InspirationBoardImage[]>;
  createBoardImage(image: InsertInspirationBoardImage): Promise<InspirationBoardImage>;
  updateBoardImage(id: number, data: any): Promise<InspirationBoardImage>;
  deleteBoardImage(id: number): Promise<void>;
  
  // Inspiration Board Notes
  getBoardNotes(boardId: number): Promise<InspirationBoardNote[]>;
  createBoardNote(note: InsertInspirationBoardNote): Promise<InspirationBoardNote>;
  updateBoardNote(id: number, data: any): Promise<InspirationBoardNote>;
  deleteBoardNote(id: number): Promise<void>;
  
  // Color Palettes
  getBoardColorPalettes(boardId: number): Promise<ColorPalette[]>;
  createColorPalette(palette: InsertColorPalette): Promise<ColorPalette>;
  updateColorPalette(id: number, data: any): Promise<ColorPalette>;
  deleteColorPalette(id: number): Promise<void>;
  
  // Board Links
  getBoardLinks(boardId: number): Promise<BoardLink[]>;
  createBoardLink(link: InsertBoardLink): Promise<BoardLink>;
  updateBoardLink(id: number, data: any): Promise<BoardLink>;
  deleteBoardLink(id: number): Promise<void>;
  
  // Social Media Strategy
  getSocialMediaStrategy(userId: string): Promise<SocialMediaStrategy | undefined>;
  upsertSocialMediaStrategy(strategy: InsertSocialMediaStrategy): Promise<SocialMediaStrategy>;
  
  // Resource Library
  getResourceLibraryItems(userId: string): Promise<ResourceLibraryItem[]>;
  createResourceLibraryItem(item: InsertResourceLibraryItem): Promise<ResourceLibraryItem>;
  updateResourceLibraryItem(id: number, data: any): Promise<ResourceLibraryItem>;
  deleteResourceLibraryItem(id: number): Promise<void>;
  updateResourceDisplayOrder(items: { id: number; displayOrder: number }[]): Promise<void>;
  
  // Affiliate Links
  getAffiliateLinks(userId: string): Promise<AffiliateLink[]>;
  createAffiliateLink(link: InsertAffiliateLink): Promise<AffiliateLink>;
  updateAffiliateLink(id: number, data: any): Promise<AffiliateLink>;
  deleteAffiliateLink(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getToolkitModules(): Promise<ToolkitModule[]> {
    return await db.select().from(toolkitModules);
  }

  async getUserToolkitData(userId: string, moduleId: number): Promise<UserToolkitData | undefined> {
    const [data] = await db
      .select()
      .from(userToolkitData)
      .where(and(eq(userToolkitData.userId, userId), eq(userToolkitData.moduleId, moduleId)));
    return data;
  }

  async upsertUserToolkitData(data: any): Promise<UserToolkitData> {
    const [result] = await db
      .insert(userToolkitData)
      .values(data)
      .onConflictDoUpdate({
        target: [userToolkitData.userId, userToolkitData.moduleId],
        set: {
          data: data.data,
          lastUsed: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getDailyFocusTasks(userId: string, date: Date): Promise<DailyFocusTask[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(dailyFocusTasks)
      .where(
        and(
          eq(dailyFocusTasks.userId, userId),
          gte(dailyFocusTasks.date, startOfDay),
          lte(dailyFocusTasks.date, endOfDay)
        )
      );
  }

  async createDailyFocusTask(task: InsertDailyFocusTask): Promise<DailyFocusTask> {
    const [result] = await db
      .insert(dailyFocusTasks)
      .values(task)
      .returning();
    return result;
  }

  async updateDailyFocusTask(id: number, completed: boolean): Promise<DailyFocusTask> {
    const [result] = await db
      .update(dailyFocusTasks)
      .set({ completed, updatedAt: new Date() })
      .where(eq(dailyFocusTasks.id, id))
      .returning();
    return result;
  }

  async clearDailyFocusTasks(userId: string, date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    await db
      .delete(dailyFocusTasks)
      .where(
        and(
          eq(dailyFocusTasks.userId, userId),
          gte(dailyFocusTasks.date, startOfDay),
          lte(dailyFocusTasks.date, endOfDay)
        )
      );
  }

  async logTaskCompletion(log: InsertTaskCompletionLog): Promise<TaskCompletionLog> {
    const [result] = await db
      .insert(taskCompletionLog)
      .values(log)
      .onConflictDoNothing()
      .returning();
    return result;
  }

  async getMonthlyTaskCompletions(userId: string, year: number, month: number): Promise<number> {
    const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskCompletionLog)
      .where(
        and(
          eq(taskCompletionLog.userId, userId),
          gte(taskCompletionLog.dateCompleted, startOfMonth),
          lte(taskCompletionLog.dateCompleted, endOfMonth)
        )
      );
    
    return result?.count || 0;
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async createActivityLog(activity: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db
      .insert(activityLog)
      .values(activity)
      .returning();
    return result;
  }

  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .orderBy(desc(userStats.weekStart))
      .limit(1);
    return stats;
  }

  async updateUserStats(userId: string, statsUpdate: Partial<UserStats>): Promise<UserStats> {
    // Check if stats exist for this user
    const existingStats = await this.getUserStats(userId);
    
    if (existingStats) {
      // Update existing stats
      const [result] = await db
        .update(userStats)
        .set({ ...statsUpdate, updatedAt: new Date() })
        .where(eq(userStats.userId, userId))
        .returning();
      return result;
    } else {
      // Create new stats entry
      const [result] = await db
        .insert(userStats)
        .values({
          userId,
          completedTasks: 0,
          focusHours: 0,
          daysShowedUp: 0,
          currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
          weekStart: new Date(),
          ...statsUpdate,
        })
        .returning();
      return result;
    }
  }

  async getTemplatesByModule(moduleId: number): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.moduleId, moduleId));
  }

  async getUserTemplateInstances(userId: string, templateId?: number): Promise<UserTemplateInstance[]> {
    if (templateId) {
      return await db
        .select()
        .from(userTemplateInstances)
        .where(and(eq(userTemplateInstances.userId, userId), eq(userTemplateInstances.templateId, templateId)))
        .orderBy(desc(userTemplateInstances.updatedAt));
    }

    return await db
      .select()
      .from(userTemplateInstances)
      .where(eq(userTemplateInstances.userId, userId))
      .orderBy(desc(userTemplateInstances.updatedAt));
  }

  async createUserTemplateInstance(instance: InsertUserTemplateInstance): Promise<UserTemplateInstance> {
    const [result] = await db
      .insert(userTemplateInstances)
      .values(instance)
      .returning();
    return result;
  }

  async updateUserTemplateInstance(id: number, data: any): Promise<UserTemplateInstance> {
    const [result] = await db
      .update(userTemplateInstances)
      .set({ data, updatedAt: new Date() })
      .where(eq(userTemplateInstances.id, id))
      .returning();
    return result;
  }

  async deleteUserTemplateInstance(id: number): Promise<void> {
    await db.delete(userTemplateInstances).where(eq(userTemplateInstances.id, id));
  }
  
  async recordDashboardAccess(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const currentMonth = today.slice(0, 7); // YYYY-MM format
    
    try {
      // Try to insert a new access record (will fail if already exists for today)
      await db.insert(dashboardAccess).values({
        userId,
        accessDate: today,
        month: currentMonth,
      });
      
      // If successful, update the user's stats
      await this.updateDashboardAccessStats(userId, currentMonth);
    } catch (error) {
      // Access already recorded for today, that's fine
    }
  }
  
  async getMonthlyDashboardAccess(userId: string, month: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(dashboardAccess)
      .where(and(
        eq(dashboardAccess.userId, userId),
        eq(dashboardAccess.month, month)
      ));
    
    return result[0]?.count || 0;
  }
  
  private async updateDashboardAccessStats(userId: string, currentMonth: string): Promise<void> {
    // Get current stats
    const existingStats = await this.getUserStats(userId);
    
    // Check if we need to reset for a new month
    const shouldReset = existingStats?.currentMonth !== currentMonth;
    
    if (shouldReset) {
      // Reset stats for new month
      await this.updateUserStats(userId, {
        daysShowedUp: 1,
        currentMonth: currentMonth,
      });
    } else {
      // Increment days showed up
      const currentDays = existingStats?.daysShowedUp || 0;
      await this.updateUserStats(userId, {
        daysShowedUp: currentDays + 1,
      });
    }
  }

  // Workflow Templates
  async getWorkflowTemplateInstances(userId: string, templateType?: string, includeArchived?: boolean): Promise<WorkflowTemplateInstance[]> {
    const conditions = [eq(workflowTemplateInstances.userId, userId)];
    
    if (templateType) {
      conditions.push(eq(workflowTemplateInstances.templateType, templateType));
    }
    
    if (!includeArchived) {
      conditions.push(eq(workflowTemplateInstances.isArchived, false));
    }
    
    return await db.select()
      .from(workflowTemplateInstances)
      .where(and(...conditions))
      .orderBy(desc(workflowTemplateInstances.lastEditedAt));
  }

  async getWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance | undefined> {
    const [instance] = await db.select()
      .from(workflowTemplateInstances)
      .where(eq(workflowTemplateInstances.id, id));
    return instance;
  }

  async createWorkflowTemplateInstance(instance: InsertWorkflowTemplateInstance): Promise<WorkflowTemplateInstance> {
    const [newInstance] = await db
      .insert(workflowTemplateInstances)
      .values(instance)
      .returning();
    return newInstance;
  }

  async updateWorkflowTemplateInstance(id: number, data: any, title?: string): Promise<WorkflowTemplateInstance> {
    const updateData: any = {
      data,
      lastEditedAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (title) {
      updateData.title = title;
    }
    
    const [updatedInstance] = await db
      .update(workflowTemplateInstances)
      .set(updateData)
      .where(eq(workflowTemplateInstances.id, id))
      .returning();
    return updatedInstance;
  }

  async getArchivedWorkflowTemplateInstances(userId: string): Promise<WorkflowTemplateInstance[]> {
    return await db.select()
      .from(workflowTemplateInstances)
      .where(and(
        eq(workflowTemplateInstances.userId, userId),
        eq(workflowTemplateInstances.isArchived, true)
      ))
      .orderBy(desc(workflowTemplateInstances.archivedAt));
  }

  async archiveWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance> {
    const [archivedInstance] = await db
      .update(workflowTemplateInstances)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflowTemplateInstances.id, id))
      .returning();
    return archivedInstance;
  }

  async restoreWorkflowTemplateInstance(id: number): Promise<WorkflowTemplateInstance> {
    const [restoredInstance] = await db
      .update(workflowTemplateInstances)
      .set({
        isArchived: false,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(workflowTemplateInstances.id, id))
      .returning();
    return restoredInstance;
  }

  async deleteWorkflowTemplateInstance(id: number): Promise<void> {
    // First delete associated files
    await db.delete(workflowTemplateFiles)
      .where(eq(workflowTemplateFiles.templateInstanceId, id));
    
    // Then delete the instance
    await db.delete(workflowTemplateInstances)
      .where(eq(workflowTemplateInstances.id, id));
  }

  async bulkDeleteWorkflowTemplateInstances(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    
    // First delete associated files for all instances
    await db.delete(workflowTemplateFiles)
      .where(inArray(workflowTemplateFiles.templateInstanceId, ids));
    
    // Then delete all instances
    await db.delete(workflowTemplateInstances)
      .where(inArray(workflowTemplateInstances.id, ids));
  }

  // Workflow Template Files
  async getWorkflowTemplateFiles(templateInstanceId: number): Promise<WorkflowTemplateFile[]> {
    return await db.select()
      .from(workflowTemplateFiles)
      .where(eq(workflowTemplateFiles.templateInstanceId, templateInstanceId))
      .orderBy(desc(workflowTemplateFiles.uploadedAt));
  }

  async createWorkflowTemplateFile(file: InsertWorkflowTemplateFile): Promise<WorkflowTemplateFile> {
    const [newFile] = await db
      .insert(workflowTemplateFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async deleteWorkflowTemplateFile(id: number): Promise<void> {
    await db.delete(workflowTemplateFiles)
      .where(eq(workflowTemplateFiles.id, id));
  }

  // Inspiration Boards
  async getInspirationBoards(userId: string, includeArchived = false): Promise<InspirationBoard[]> {
    return await db
      .select()
      .from(inspirationBoards)
      .where(and(
        eq(inspirationBoards.userId, userId),
        includeArchived ? undefined : eq(inspirationBoards.isArchived, false)
      ))
      .orderBy(desc(inspirationBoards.createdAt));
  }

  async getArchivedInspirationBoards(userId: string): Promise<InspirationBoard[]> {
    return await db
      .select()
      .from(inspirationBoards)
      .where(and(
        eq(inspirationBoards.userId, userId),
        eq(inspirationBoards.isArchived, true)
      ))
      .orderBy(desc(inspirationBoards.archivedAt));
  }

  async getInspirationBoard(id: number): Promise<InspirationBoard | undefined> {
    const [board] = await db
      .select()
      .from(inspirationBoards)
      .where(eq(inspirationBoards.id, id));
    return board;
  }

  async createInspirationBoard(board: InsertInspirationBoard): Promise<InspirationBoard> {
    console.log("Storage - Creating inspiration board with data:", board);
    try {
      const [newBoard] = await db
        .insert(inspirationBoards)
        .values(board)
        .returning();
      console.log("Storage - Inspiration board created successfully:", newBoard);
      return newBoard;
    } catch (error) {
      console.error("Storage - Error creating inspiration board:", error);
      throw error;
    }
  }

  async updateInspirationBoard(id: number, data: any): Promise<InspirationBoard> {
    const [updatedBoard] = await db
      .update(inspirationBoards)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(inspirationBoards.id, id))
      .returning();
    return updatedBoard;
  }

  async duplicateInspirationBoard(id: number, userId: string): Promise<InspirationBoard> {
    const originalBoard = await this.getInspirationBoard(id);
    if (!originalBoard) throw new Error("Board not found");

    const [duplicatedBoard] = await db
      .insert(inspirationBoards)
      .values({
        userId,
        title: `${originalBoard.title} (Copy)`,
        description: originalBoard.description,
        backgroundColor: originalBoard.backgroundColor,
        backgroundTexture: originalBoard.backgroundTexture,
      })
      .returning();

    // Copy images, notes, palettes, and links
    const [images, notes, palettes, links] = await Promise.all([
      this.getBoardImages(id),
      this.getBoardNotes(id),
      this.getBoardColorPalettes(id),
      this.getBoardLinks(id),
    ]);

    await Promise.all([
      ...images.map(img => this.createBoardImage({
        boardId: duplicatedBoard.id,
        imageUrl: img.imageUrl,
        caption: img.caption,
        tags: img.tags,
        position: img.position,
        isPinned: img.isPinned,
      })),
      ...notes.map(note => this.createBoardNote({
        boardId: duplicatedBoard.id,
        title: note.title,
        content: note.content,
        color: note.color,
        position: note.position,
      })),
      ...palettes.map(palette => this.createColorPalette({
        boardId: duplicatedBoard.id,
        name: palette.name,
        colors: palette.colors,
      })),
      ...links.map(link => this.createBoardLink({
        boardId: duplicatedBoard.id,
        url: link.url,
        title: link.title,
        description: link.description,
        thumbnailUrl: link.thumbnailUrl,
        position: link.position,
      })),
    ]);

    return duplicatedBoard;
  }

  async archiveInspirationBoard(id: number): Promise<InspirationBoard> {
    const [archivedBoard] = await db
      .update(inspirationBoards)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inspirationBoards.id, id))
      .returning();
    return archivedBoard;
  }

  async restoreInspirationBoard(id: number): Promise<InspirationBoard> {
    const [restoredBoard] = await db
      .update(inspirationBoards)
      .set({
        isArchived: false,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(inspirationBoards.id, id))
      .returning();
    return restoredBoard;
  }

  async deleteInspirationBoard(id: number): Promise<void> {
    await db.delete(inspirationBoards)
      .where(eq(inspirationBoards.id, id));
  }

  // Inspiration Board Images
  async getBoardImages(boardId: number): Promise<InspirationBoardImage[]> {
    return await db
      .select()
      .from(inspirationBoardImages)
      .where(eq(inspirationBoardImages.boardId, boardId))
      .orderBy(desc(inspirationBoardImages.createdAt));
  }

  async createBoardImage(image: InsertInspirationBoardImage): Promise<InspirationBoardImage> {
    const [newImage] = await db
      .insert(inspirationBoardImages)
      .values(image)
      .returning();
    return newImage;
  }

  async updateBoardImage(id: number, data: any): Promise<InspirationBoardImage> {
    const [updatedImage] = await db
      .update(inspirationBoardImages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(inspirationBoardImages.id, id))
      .returning();
    return updatedImage;
  }

  async deleteBoardImage(id: number): Promise<void> {
    await db.delete(inspirationBoardImages)
      .where(eq(inspirationBoardImages.id, id));
  }

  // Inspiration Board Notes
  async getBoardNotes(boardId: number): Promise<InspirationBoardNote[]> {
    return await db
      .select()
      .from(inspirationBoardNotes)
      .where(eq(inspirationBoardNotes.boardId, boardId))
      .orderBy(desc(inspirationBoardNotes.createdAt));
  }

  async createBoardNote(note: InsertInspirationBoardNote): Promise<InspirationBoardNote> {
    const [newNote] = await db
      .insert(inspirationBoardNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async updateBoardNote(id: number, data: any): Promise<InspirationBoardNote> {
    const [updatedNote] = await db
      .update(inspirationBoardNotes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(inspirationBoardNotes.id, id))
      .returning();
    return updatedNote;
  }

  async deleteBoardNote(id: number): Promise<void> {
    await db.delete(inspirationBoardNotes)
      .where(eq(inspirationBoardNotes.id, id));
  }

  // Color Palettes
  async getBoardColorPalettes(boardId: number): Promise<ColorPalette[]> {
    return await db
      .select()
      .from(colorPalettes)
      .where(eq(colorPalettes.boardId, boardId))
      .orderBy(desc(colorPalettes.createdAt));
  }

  async createColorPalette(palette: InsertColorPalette): Promise<ColorPalette> {
    const [newPalette] = await db
      .insert(colorPalettes)
      .values(palette)
      .returning();
    return newPalette;
  }

  async updateColorPalette(id: number, data: any): Promise<ColorPalette> {
    const [updatedPalette] = await db
      .update(colorPalettes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(colorPalettes.id, id))
      .returning();
    return updatedPalette;
  }

  async deleteColorPalette(id: number): Promise<void> {
    await db.delete(colorPalettes)
      .where(eq(colorPalettes.id, id));
  }

  // Board Links
  async getBoardLinks(boardId: number): Promise<BoardLink[]> {
    return await db
      .select()
      .from(boardLinks)
      .where(eq(boardLinks.boardId, boardId))
      .orderBy(asc(boardLinks.position));
  }

  async createBoardLink(link: InsertBoardLink): Promise<BoardLink> {
    const [newLink] = await db
      .insert(boardLinks)
      .values(link)
      .returning();
    return newLink;
  }

  async updateBoardLink(id: number, data: any): Promise<BoardLink> {
    const [updatedLink] = await db
      .update(boardLinks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(boardLinks.id, id))
      .returning();
    return updatedLink;
  }

  async deleteBoardLink(id: number): Promise<void> {
    await db.delete(boardLinks)
      .where(eq(boardLinks.id, id));
  }

  // Social Media Strategy
  async getSocialMediaStrategy(userId: string): Promise<SocialMediaStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(socialMediaStrategies)
      .where(eq(socialMediaStrategies.userId, userId));
    return strategy;
  }

  async upsertSocialMediaStrategy(strategyData: InsertSocialMediaStrategy): Promise<SocialMediaStrategy> {
    const [strategy] = await db
      .insert(socialMediaStrategies)
      .values(strategyData)
      .onConflictDoUpdate({
        target: socialMediaStrategies.userId,
        set: {
          contentGoals: strategyData.contentGoals,
          pillars: strategyData.pillars,
          updatedAt: new Date(),
        },
      })
      .returning();
    return strategy;
  }

  // Resource Library
  async getResourceLibraryItems(userId: string): Promise<ResourceLibraryItem[]> {
    return await db
      .select()
      .from(resourceLibrary)
      .where(eq(resourceLibrary.userId, userId))
      .orderBy(asc(resourceLibrary.displayOrder));
  }

  async createResourceLibraryItem(itemData: InsertResourceLibraryItem): Promise<ResourceLibraryItem> {
    const [item] = await db
      .insert(resourceLibrary)
      .values(itemData)
      .returning();
    return item;
  }

  async updateResourceLibraryItem(id: number, data: any): Promise<ResourceLibraryItem> {
    const [updatedItem] = await db
      .update(resourceLibrary)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(resourceLibrary.id, id))
      .returning();
    return updatedItem;
  }

  async deleteResourceLibraryItem(id: number): Promise<void> {
    await db.delete(resourceLibrary)
      .where(eq(resourceLibrary.id, id));
  }

  async updateResourceDisplayOrder(items: { id: number; displayOrder: number }[]): Promise<void> {
    // Update display order for each item
    for (const item of items) {
      await db
        .update(resourceLibrary)
        .set({ displayOrder: item.displayOrder })
        .where(eq(resourceLibrary.id, item.id));
    }
  }

  // Affiliate Links
  async getAffiliateLinks(userId: string): Promise<AffiliateLink[]> {
    return await db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, userId))
      .orderBy(desc(affiliateLinks.createdAt));
  }

  async createAffiliateLink(linkData: InsertAffiliateLink): Promise<AffiliateLink> {
    const [link] = await db
      .insert(affiliateLinks)
      .values(linkData)
      .returning();
    return link;
  }

  async updateAffiliateLink(id: number, data: any): Promise<AffiliateLink> {
    const [updatedLink] = await db
      .update(affiliateLinks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(affiliateLinks.id, id))
      .returning();
    return updatedLink;
  }

  async deleteAffiliateLink(id: number): Promise<void> {
    await db.delete(affiliateLinks)
      .where(eq(affiliateLinks.id, id));
  }
}

export const storage = new DatabaseStorage();
