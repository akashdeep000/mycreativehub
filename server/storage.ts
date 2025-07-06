import {
  users,
  toolkitModules,
  userToolkitData,
  dailyFocusTasks,
  activityLog,
  userStats,
  templates,
  userTemplateInstances,
  dashboardAccess,
  workflowTemplateInstances,
  workflowTemplateFiles,
  type User,
  type UpsertUser,
  type ToolkitModule,
  type UserToolkitData,
  type DailyFocusTask,
  type InsertDailyFocusTask,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - supports both Replit Auth and custom auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Toolkit modules
  getToolkitModules(): Promise<ToolkitModule[]>;
  getUserToolkitData(userId: string, moduleId: number): Promise<UserToolkitData | undefined>;
  upsertUserToolkitData(data: any): Promise<UserToolkitData>;
  
  // Daily focus tasks
  getDailyFocusTasks(userId: string, date: Date): Promise<DailyFocusTask[]>;
  createDailyFocusTask(task: InsertDailyFocusTask): Promise<DailyFocusTask>;
  updateDailyFocusTask(id: number, completed: boolean): Promise<DailyFocusTask>;
  
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
}

export const storage = new DatabaseStorage();
