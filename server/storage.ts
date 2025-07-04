import {
  users,
  toolkitModules,
  userToolkitData,
  dailyFocusTasks,
  activityLog,
  userStats,
  templates,
  userTemplateInstances,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
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
  
  // Templates
  getTemplatesByModule(moduleId: number): Promise<Template[]>;
  getUserTemplateInstances(userId: string, templateId?: number): Promise<UserTemplateInstance[]>;
  createUserTemplateInstance(instance: InsertUserTemplateInstance): Promise<UserTemplateInstance>;
  updateUserTemplateInstance(id: number, data: any): Promise<UserTemplateInstance>;
  deleteUserTemplateInstance(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats> {
    const [result] = await db
      .update(userStats)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(userStats.userId, userId))
      .returning();
    return result;
  }

  async getTemplatesByModule(moduleId: number): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.moduleId, moduleId));
  }

  async getUserTemplateInstances(userId: string, templateId?: number): Promise<UserTemplateInstance[]> {
    let query = db
      .select()
      .from(userTemplateInstances)
      .where(eq(userTemplateInstances.userId, userId));

    if (templateId) {
      query = query.where(eq(userTemplateInstances.templateId, templateId));
    }

    return await query.orderBy(desc(userTemplateInstances.updatedAt));
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
}

export const storage = new DatabaseStorage();
