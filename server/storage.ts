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
  // New persistent data tables
  monthlyContentCalendar,
  contentBatchingPlanner,
  contentStatusTracker,
  repurposingToolkit,
  contentPerformanceStrategy,
  performanceTrackingTable,
  seasonalityTimeline,
  quarterDetailPlans,
  productComponentChecklists,
  profitCalculator,
  prelaunchTimelinePlanner,
  launchGrowthPlans,
  moneyMap,
  sopBuilders,
  automationToolkit,
  focusSessionLogs,
  calendarV2,
  calendarV3,
  globalColorKeys,
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
  // New persistent data types
  type MonthlyContentCalendar,
  type InsertMonthlyContentCalendar,
  type ContentBatchingPlanner,
  type InsertContentBatchingPlanner,
  type ContentStatusTracker,
  type InsertContentStatusTracker,
  type RepurposingToolkit,
  type InsertRepurposingToolkit,
  type ContentPerformanceStrategy,
  type InsertContentPerformanceStrategy,
  type PerformanceTrackingTable,
  type InsertPerformanceTrackingTable,
  type SeasonalityTimeline,
  type InsertSeasonalityTimeline,
  type QuarterDetailPlan,
  type InsertQuarterDetailPlan,
  type ProductComponentChecklist,
  type InsertProductComponentChecklist,
  type ProfitCalculator,
  type InsertProfitCalculator,
  type PrelaunchTimelinePlanner,
  type InsertPrelaunchTimelinePlanner,
  type LaunchGrowthPlan,
  type InsertLaunchGrowthPlan,
  type MoneyMap,
  type InsertMoneyMap,
  type SopBuilder,
  type InsertSopBuilder,
  type AutomationToolkit,
  type InsertAutomationToolkit,
  type FocusSessionLog,
  type InsertFocusSessionLog,
  type CalendarV2,
  type CalendarV3,
  type InsertCalendarV3,
  type ColorKeyV3,
  type CalendarEntryV3,
  type CalendarDayV3,
  type InsertCalendarV2,
  type GlobalColorKeys,
  type InsertGlobalColorKeys,
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
  getDailyFocusTasks(userId: string): Promise<DailyFocusTask[]>;
  getDailyFocusTask(id: number): Promise<DailyFocusTask | undefined>;
  createDailyFocusTask(task: InsertDailyFocusTask): Promise<DailyFocusTask>;
  updateDailyFocusTask(id: number, completed: boolean): Promise<DailyFocusTask>;
  deleteDailyFocusTask(id: number): Promise<void>;
  clearDailyFocusTasks(userId: string): Promise<void>;
  
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
  
  // Persistent Data Operations - Content Creation System
  getMonthlyContentCalendar(userId: string, year: number, month: number): Promise<MonthlyContentCalendar | undefined>;
  upsertMonthlyContentCalendar(data: InsertMonthlyContentCalendar): Promise<MonthlyContentCalendar>;
  
  getContentBatchingPlanner(userId: string): Promise<ContentBatchingPlanner | undefined>;
  upsertContentBatchingPlanner(data: InsertContentBatchingPlanner): Promise<ContentBatchingPlanner>;
  
  getContentStatusTracker(userId: string): Promise<ContentStatusTracker | undefined>;
  upsertContentStatusTracker(data: InsertContentStatusTracker): Promise<ContentStatusTracker>;
  
  getRepurposingToolkit(userId: string): Promise<RepurposingToolkit | undefined>;
  upsertRepurposingToolkit(data: InsertRepurposingToolkit): Promise<RepurposingToolkit>;
  
  getContentPerformanceStrategy(userId: string): Promise<ContentPerformanceStrategy | undefined>;
  upsertContentPerformanceStrategy(data: InsertContentPerformanceStrategy): Promise<ContentPerformanceStrategy>;
  
  getPerformanceTrackingTable(userId: string): Promise<PerformanceTrackingTable | undefined>;
  upsertPerformanceTrackingTable(data: InsertPerformanceTrackingTable): Promise<PerformanceTrackingTable>;
  
  // Product Launch System
  getSeasonalityTimeline(userId: string, year: number): Promise<SeasonalityTimeline | undefined>;
  upsertSeasonalityTimeline(data: InsertSeasonalityTimeline): Promise<SeasonalityTimeline>;
  
  getQuarterDetailPlan(userId: string, year: number, quarter: number): Promise<QuarterDetailPlan | undefined>;
  upsertQuarterDetailPlan(data: InsertQuarterDetailPlan): Promise<QuarterDetailPlan>;
  
  getProductComponentChecklist(userId: string): Promise<ProductComponentChecklist | undefined>;
  upsertProductComponentChecklist(data: InsertProductComponentChecklist): Promise<ProductComponentChecklist>;
  
  getProfitCalculator(userId: string): Promise<ProfitCalculator | undefined>;
  upsertProfitCalculator(data: InsertProfitCalculator): Promise<ProfitCalculator>;
  
  getPrelaunchTimelinePlanner(userId: string): Promise<PrelaunchTimelinePlanner | undefined>;
  upsertPrelaunchTimelinePlanner(data: InsertPrelaunchTimelinePlanner): Promise<PrelaunchTimelinePlanner>;
  
  getLaunchGrowthPlans(userId: string): Promise<LaunchGrowthPlan | undefined>;
  upsertLaunchGrowthPlans(data: InsertLaunchGrowthPlan): Promise<LaunchGrowthPlan>;
  
  // Financial Management System
  getMoneyMap(userId: string): Promise<MoneyMap | undefined>;
  upsertMoneyMap(data: InsertMoneyMap): Promise<MoneyMap>;
  
  // Streamline Your Workflow System
  getSopBuilder(userId: string): Promise<SopBuilder | undefined>;
  upsertSopBuilder(data: InsertSopBuilder): Promise<SopBuilder>;
  
  getAutomationToolkit(userId: string): Promise<AutomationToolkit | undefined>;
  upsertAutomationToolkit(data: InsertAutomationToolkit): Promise<AutomationToolkit>;
  
  // Focus Timer System
  logFocusSession(session: InsertFocusSessionLog): Promise<FocusSessionLog>;
  getFocusSessionLogs(userId: string, limit?: number): Promise<FocusSessionLog[]>;
  
  // Calendar V2 Operations
  getCalendarV2(userId: string, year: number, month: number): Promise<CalendarV2 | undefined>;
  upsertCalendarV2(data: InsertCalendarV2): Promise<CalendarV2>;
  
  // Calendar V3 Operations
  getCalendarV3(userId: string, year: number, month: number): Promise<CalendarV3 | undefined>;
  upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3>;
  
  // Global Color Keys Operations
  getGlobalColorKeys(userId: string): Promise<GlobalColorKeys | undefined>;
  upsertGlobalColorKeys(data: InsertGlobalColorKeys): Promise<GlobalColorKeys>;
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

  async getDailyFocusTasks(userId: string): Promise<DailyFocusTask[]> {
    return await db
      .select()
      .from(dailyFocusTasks)
      .where(eq(dailyFocusTasks.userId, userId))
      .orderBy(dailyFocusTasks.createdAt);
  }

  async createDailyFocusTask(task: InsertDailyFocusTask): Promise<DailyFocusTask> {
    const [result] = await db
      .insert(dailyFocusTasks)
      .values(task)
      .returning();
    return result;
  }

  async getDailyFocusTask(id: number): Promise<DailyFocusTask | undefined> {
    const [result] = await db
      .select()
      .from(dailyFocusTasks)
      .where(eq(dailyFocusTasks.id, id))
      .limit(1);
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

  async updateDailyFocusTaskText(id: number, task: string): Promise<DailyFocusTask> {
    const [result] = await db
      .update(dailyFocusTasks)
      .set({ task, updatedAt: new Date() })
      .where(eq(dailyFocusTasks.id, id))
      .returning();
    return result;
  }

  async deleteDailyFocusTask(id: number): Promise<void> {
    // First delete any task completion logs for this task
    await db
      .delete(taskCompletionLog)
      .where(eq(taskCompletionLog.taskId, id));
    
    // Then delete the task itself
    await db
      .delete(dailyFocusTasks)
      .where(eq(dailyFocusTasks.id, id));
  }

  async clearDailyFocusTasks(userId: string): Promise<void> {
    await db
      .delete(dailyFocusTasks)
      .where(eq(dailyFocusTasks.userId, userId));
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
        position: img.position as any,
        isPinned: img.isPinned,
      })),
      ...notes.map(note => this.createBoardNote({
        boardId: duplicatedBoard.id,
        title: note.title,
        content: note.content,
        color: note.color,
        position: note.position as any,
      })),
      ...palettes.map(palette => this.createColorPalette({
        boardId: duplicatedBoard.id,
        name: palette.name,
        colors: palette.colors as any,
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
    // First check if a strategy exists for this user
    const existingStrategy = await this.getSocialMediaStrategy(strategyData.userId!);
    
    if (existingStrategy) {
      // Update existing strategy
      const [strategy] = await db
        .update(socialMediaStrategies)
        .set({
          contentGoals: strategyData.contentGoals,
          pillars: strategyData.pillars,
          updatedAt: new Date(),
        })
        .where(eq(socialMediaStrategies.userId, strategyData.userId!))
        .returning();
      return strategy;
    } else {
      // Insert new strategy
      const [strategy] = await db
        .insert(socialMediaStrategies)
        .values(strategyData)
        .returning();
      return strategy;
    }
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

  // Persistent Data Operations - Content Creation System
  async getMonthlyContentCalendar(userId: string, year: number, month: number): Promise<MonthlyContentCalendar | undefined> {
    console.log('Storage GET - Querying calendar for:', { userId, year, month });
    const [calendar] = await db
      .select()
      .from(monthlyContentCalendar)
      .where(and(
        eq(monthlyContentCalendar.userId, userId),
        eq(monthlyContentCalendar.year, year),
        eq(monthlyContentCalendar.month, month)
      ));
    console.log('Storage GET - Raw database result:', calendar);
    console.log('Storage GET - Calendar data type:', typeof calendar?.calendarData, 'Value:', calendar?.calendarData);
    console.log('Storage GET - Color tags type:', typeof calendar?.colorTags, 'Value:', calendar?.colorTags);
    return calendar;
  }

  async upsertMonthlyContentCalendar(data: InsertMonthlyContentCalendar): Promise<MonthlyContentCalendar> {
    console.log('=== STORAGE UPSERT START ===');
    console.log('Input data received:', {
      userId: data.userId,
      year: data.year,
      month: data.month,
      calendarDataType: typeof data.calendarData,
      calendarDataIsArray: Array.isArray(data.calendarData),
      calendarDataLength: Array.isArray(data.calendarData) ? data.calendarData.length : 0,
      colorTagsType: typeof data.colorTags,
      colorTagsIsArray: Array.isArray(data.colorTags),
      colorTagsLength: Array.isArray(data.colorTags) ? data.colorTags.length : 0
    });
    
    // Force JSON serialization to ensure proper storage
    const finalData = {
      ...data,
      calendarData: Array.isArray(data.calendarData) ? data.calendarData : [],
      colorTags: Array.isArray(data.colorTags) ? data.colorTags : []
    };
    
    console.log('Final data for DB insert:', {
      calendarDataFinal: finalData.calendarData,
      colorTagsFinal: finalData.colorTags
    });
    
    try {
      // First, try to get existing record
      const existing = await db
        .select()
        .from(monthlyContentCalendar)
        .where(and(
          eq(monthlyContentCalendar.userId, finalData.userId),
          eq(monthlyContentCalendar.year, finalData.year),
          eq(monthlyContentCalendar.month, finalData.month)
        ));

      let calendar;
      if (existing.length > 0) {
        // Update existing record
        console.log('Updating existing calendar record:', existing[0].id);
        [calendar] = await db
          .update(monthlyContentCalendar)
          .set({
            calendarData: finalData.calendarData,
            colorTags: finalData.colorTags,
            updatedAt: new Date(),
          })
          .where(eq(monthlyContentCalendar.id, existing[0].id))
          .returning();
      } else {
        // Insert new record
        console.log('Creating new calendar record');
        [calendar] = await db
          .insert(monthlyContentCalendar)
          .values(finalData)
          .returning();
      }
      
      console.log('Database insert/update successful - returned result:', {
        id: calendar.id,
        userId: calendar.userId,
        year: calendar.year,
        month: calendar.month,
        actualCalendarData: calendar.calendarData,
        actualColorTags: calendar.colorTags,
        calendarDataType: typeof calendar.calendarData,
        colorTagsType: typeof calendar.colorTags,
        calendarDataIsArray: Array.isArray(calendar.calendarData),
        colorTagsIsArray: Array.isArray(calendar.colorTags)
      });
      
      // Immediately verify the data was saved by querying it back
      const verification = await db
        .select()
        .from(monthlyContentCalendar)
        .where(and(
          eq(monthlyContentCalendar.id, calendar.id)
        ));
      
      console.log('VERIFICATION QUERY - Data actually in database:', {
        verificationResult: verification[0],
        verificationCalendarData: verification[0]?.calendarData,
        verificationColorTags: verification[0]?.colorTags
      });
      
      console.log('=== STORAGE UPSERT RESULT ===');
      console.log('Database returned:', {
        id: calendar.id,
        calendarDataType: typeof calendar.calendarData,
        calendarDataIsArray: Array.isArray(calendar.calendarData),
        calendarDataLength: Array.isArray(calendar.calendarData) ? calendar.calendarData.length : 0,
        calendarDataValue: calendar.calendarData,
        colorTagsType: typeof calendar.colorTags,
        colorTagsIsArray: Array.isArray(calendar.colorTags),
        colorTagsLength: Array.isArray(calendar.colorTags) ? calendar.colorTags.length : 0,
        colorTagsValue: calendar.colorTags
      });
      console.log('=== STORAGE UPSERT END ===');
      return calendar;
    } catch (error) {
      console.error('=== DATABASE ERROR DURING UPSERT ===');
      console.error('Error details:', error);
      console.error('Data that failed to save:', finalData);
      throw error;
    }
  }

  async getContentBatchingPlanner(userId: string): Promise<ContentBatchingPlanner | undefined> {
    const [planner] = await db
      .select()
      .from(contentBatchingPlanner)
      .where(eq(contentBatchingPlanner.userId, userId));
    return planner;
  }

  async upsertContentBatchingPlanner(data: InsertContentBatchingPlanner): Promise<ContentBatchingPlanner> {
    const [planner] = await db
      .insert(contentBatchingPlanner)
      .values(data)
      .onConflictDoUpdate({
        target: contentBatchingPlanner.userId,
        set: {
          posts: data.posts,
          customPillars: data.customPillars,
          customPostTypes: data.customPostTypes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return planner;
  }

  async getContentStatusTracker(userId: string): Promise<ContentStatusTracker | undefined> {
    const [tracker] = await db
      .select()
      .from(contentStatusTracker)
      .where(eq(contentStatusTracker.userId, userId));
    return tracker;
  }

  async upsertContentStatusTracker(data: InsertContentStatusTracker): Promise<ContentStatusTracker> {
    const [tracker] = await db
      .insert(contentStatusTracker)
      .values(data)
      .onConflictDoUpdate({
        target: contentStatusTracker.userId,
        set: {
          contentItems: data.contentItems,
          customTypes: data.customTypes,
          customPlatforms: data.customPlatforms,
          customStatuses: data.customStatuses,
          updatedAt: new Date(),
        },
      })
      .returning();
    return tracker;
  }

  async getRepurposingToolkit(userId: string): Promise<RepurposingToolkit | undefined> {
    const [toolkit] = await db
      .select()
      .from(repurposingToolkit)
      .where(eq(repurposingToolkit.userId, userId));
    return toolkit;
  }

  async upsertRepurposingToolkit(data: InsertRepurposingToolkit): Promise<RepurposingToolkit> {
    const [toolkit] = await db
      .insert(repurposingToolkit)
      .values(data)
      .onConflictDoUpdate({
        target: repurposingToolkit.userId,
        set: {
          repurposingItems: data.repurposingItems,
          customPlatforms: data.customPlatforms,
          customFormats: data.customFormats,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toolkit;
  }

  async getContentPerformanceStrategy(userId: string): Promise<ContentPerformanceStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(contentPerformanceStrategy)
      .where(eq(contentPerformanceStrategy.userId, userId));
    return strategy;
  }

  async upsertContentPerformanceStrategy(data: InsertContentPerformanceStrategy): Promise<ContentPerformanceStrategy> {
    const [strategy] = await db
      .insert(contentPerformanceStrategy)
      .values(data)
      .onConflictDoUpdate({
        target: contentPerformanceStrategy.userId,
        set: {
          contentThatFeltGood: data.contentThatFeltGood,
          contentThatPerformed: data.contentThatPerformed,
          whatDidntLand: data.whatDidntLand,
          audienceReactions: data.audienceReactions,
          strategyShifts: data.strategyShifts,
          nextCheckInDate: data.nextCheckInDate,
          updatedAt: new Date(),
        },
      })
      .returning();
    return strategy;
  }

  async getPerformanceTrackingTable(userId: string): Promise<PerformanceTrackingTable | undefined> {
    const [table] = await db
      .select()
      .from(performanceTrackingTable)
      .where(eq(performanceTrackingTable.userId, userId));
    return table;
  }

  async upsertPerformanceTrackingTable(data: InsertPerformanceTrackingTable): Promise<PerformanceTrackingTable> {
    const [table] = await db
      .insert(performanceTrackingTable)
      .values(data)
      .onConflictDoUpdate({
        target: performanceTrackingTable.userId,
        set: {
          performanceItems: data.performanceItems,
          customContentTypes: data.customContentTypes,
          customPlatforms: data.customPlatforms,
          updatedAt: new Date(),
        },
      })
      .returning();
    return table;
  }

  // Product Launch System
  async getSeasonalityTimeline(userId: string, year: number): Promise<SeasonalityTimeline | undefined> {
    const [timeline] = await db
      .select()
      .from(seasonalityTimeline)
      .where(and(
        eq(seasonalityTimeline.userId, userId),
        eq(seasonalityTimeline.year, year)
      ));
    return timeline;
  }

  async upsertSeasonalityTimeline(data: InsertSeasonalityTimeline): Promise<SeasonalityTimeline> {
    const [timeline] = await db
      .insert(seasonalityTimeline)
      .values(data)
      .onConflictDoUpdate({
        target: [seasonalityTimeline.userId, seasonalityTimeline.year],
        set: {
          events: data.events,
          eventTypes: data.eventTypes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return timeline;
  }

  async getQuarterDetailPlan(userId: string, year: number, quarter: number): Promise<QuarterDetailPlan | undefined> {
    const [plan] = await db
      .select()
      .from(quarterDetailPlans)
      .where(and(
        eq(quarterDetailPlans.userId, userId),
        eq(quarterDetailPlans.year, year),
        eq(quarterDetailPlans.quarter, quarter)
      ));
    return plan;
  }

  async upsertQuarterDetailPlan(data: InsertQuarterDetailPlan): Promise<QuarterDetailPlan> {
    const [plan] = await db
      .insert(quarterDetailPlans)
      .values(data)
      .onConflictDoUpdate({
        target: [quarterDetailPlans.userId, quarterDetailPlans.year, quarterDetailPlans.quarter],
        set: {
          quarterData: data.quarterData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return plan;
  }

  async getProductComponentChecklist(userId: string): Promise<ProductComponentChecklist | undefined> {
    const [checklist] = await db
      .select()
      .from(productComponentChecklists)
      .where(eq(productComponentChecklists.userId, userId));
    return checklist;
  }

  async upsertProductComponentChecklist(data: InsertProductComponentChecklist): Promise<ProductComponentChecklist> {
    const [checklist] = await db
      .insert(productComponentChecklists)
      .values(data)
      .onConflictDoUpdate({
        target: productComponentChecklists.userId,
        set: {
          products: data.products,
          updatedAt: new Date(),
        },
      })
      .returning();
    return checklist;
  }

  async getProfitCalculator(userId: string): Promise<ProfitCalculator | undefined> {
    const [calculator] = await db
      .select()
      .from(profitCalculator)
      .where(eq(profitCalculator.userId, userId));
    return calculator;
  }

  async upsertProfitCalculator(data: InsertProfitCalculator): Promise<ProfitCalculator> {
    const [calculator] = await db
      .insert(profitCalculator)
      .values(data)
      .onConflictDoUpdate({
        target: profitCalculator.userId,
        set: {
          savedCalculations: data.savedCalculations,
          currency: data.currency,
          currentCalculation: data.currentCalculation,
          updatedAt: new Date(),
        },
      })
      .returning();
    return calculator;
  }

  async getPrelaunchTimelinePlanner(userId: string): Promise<PrelaunchTimelinePlanner | undefined> {
    const [planner] = await db
      .select()
      .from(prelaunchTimelinePlanner)
      .where(eq(prelaunchTimelinePlanner.userId, userId));
    return planner;
  }

  async upsertPrelaunchTimelinePlanner(data: InsertPrelaunchTimelinePlanner): Promise<PrelaunchTimelinePlanner> {
    const [planner] = await db
      .insert(prelaunchTimelinePlanner)
      .values(data)
      .onConflictDoUpdate({
        target: prelaunchTimelinePlanner.userId,
        set: {
          timelineLength: data.timelineLength,
          weeklyContent: data.weeklyContent,
          weekNotes: data.weekNotes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return planner;
  }

  async getLaunchGrowthPlans(userId: string): Promise<LaunchGrowthPlan | undefined> {
    const [plans] = await db
      .select()
      .from(launchGrowthPlans)
      .where(eq(launchGrowthPlans.userId, userId));
    return plans;
  }

  async upsertLaunchGrowthPlans(data: InsertLaunchGrowthPlan): Promise<LaunchGrowthPlan> {
    const [plans] = await db
      .insert(launchGrowthPlans)
      .values(data)
      .onConflictDoUpdate({
        target: launchGrowthPlans.userId,
        set: {
          growthPlans: data.growthPlans,
          updatedAt: new Date(),
        },
      })
      .returning();
    return plans;
  }

  // Financial Management System
  async getMoneyMap(userId: string): Promise<MoneyMap | undefined> {
    const [moneymap] = await db
      .select()
      .from(moneyMap)
      .where(eq(moneyMap.userId, userId));
    return moneymap;
  }

  async upsertMoneyMap(data: InsertMoneyMap): Promise<MoneyMap> {
    const [moneymap] = await db
      .insert(moneyMap)
      .values(data)
      .onConflictDoUpdate({
        target: moneyMap.userId,
        set: {
          currency: data.currency,
          period: data.period,
          goalsData: data.goalsData,
          incomeExpensesData: data.incomeExpensesData,
          savingsData: data.savingsData,
          monthlySnapshots: data.monthlySnapshots,
          updatedAt: new Date(),
        },
      })
      .returning();
    return moneymap;
  }

  // Streamline Your Workflow System
  async getSopBuilder(userId: string): Promise<SopBuilder | undefined> {
    const [builder] = await db
      .select()
      .from(sopBuilders)
      .where(eq(sopBuilders.userId, userId));
    return builder;
  }

  async upsertSopBuilder(data: InsertSopBuilder): Promise<SopBuilder> {
    const [builder] = await db
      .insert(sopBuilders)
      .values(data)
      .onConflictDoUpdate({
        target: sopBuilders.userId,
        set: {
          sops: data.sops,
          updatedAt: new Date(),
        },
      })
      .returning();
    return builder;
  }

  async getAutomationToolkit(userId: string): Promise<AutomationToolkit | undefined> {
    const [toolkit] = await db
      .select()
      .from(automationToolkit)
      .where(eq(automationToolkit.userId, userId));
    return toolkit;
  }

  async upsertAutomationToolkit(data: InsertAutomationToolkit): Promise<AutomationToolkit> {
    const [toolkit] = await db
      .insert(automationToolkit)
      .values(data)
      .onConflictDoUpdate({
        target: automationToolkit.userId,
        set: {
          promptLibrary: data.promptLibrary,
          flowBuilder: data.flowBuilder,
          instagramCopies: data.instagramCopies,
          prewrittenReplies: data.prewrittenReplies,
          oneClickFlows: data.oneClickFlows,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toolkit;
  }

  // Focus Timer System
  async logFocusSession(session: InsertFocusSessionLog): Promise<FocusSessionLog> {
    const [log] = await db
      .insert(focusSessionLogs)
      .values(session)
      .returning();
    return log;
  }

  async getFocusSessionLogs(userId: string, limit: number = 50): Promise<FocusSessionLog[]> {
    return await db
      .select()
      .from(focusSessionLogs)
      .where(eq(focusSessionLogs.userId, userId))
      .orderBy(desc(focusSessionLogs.completedAt))
      .limit(limit);
  }

  // Calendar V2 - Complete rebuild
  async getCalendarV2(userId: string, year: number, month: number): Promise<CalendarV2 | undefined> {
    const [calendar] = await db
      .select()
      .from(calendarV2)
      .where(and(
        eq(calendarV2.userId, userId),
        eq(calendarV2.year, year),
        eq(calendarV2.month, month)
      ));
    return calendar;
  }

  async upsertCalendarV2(data: InsertCalendarV2): Promise<CalendarV2> {
    const [calendar] = await db
      .insert(calendarV2)
      .values({
        ...data,
        colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
        days: Array.isArray(data.days) ? data.days : [],
      })
      .onConflictDoUpdate({
        target: [calendarV2.userId, calendarV2.year, calendarV2.month],
        set: {
          colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
          days: Array.isArray(data.days) ? data.days : [],
          updatedAt: new Date(),
        },
      })
      .returning();
    return calendar;
  }

  // Calendar V3 Operations
  async getCalendarV3(userId: string, year: number, month: number): Promise<CalendarV3 | undefined> {
    console.log('CalendarV3 GET - Querying for:', { userId, year, month });
    const [calendar] = await db
      .select()
      .from(calendarV3)
      .where(and(
        eq(calendarV3.userId, userId),
        eq(calendarV3.year, year),
        eq(calendarV3.month, month)
      ));
    console.log('CalendarV3 GET - Database result:', {
      found: !!calendar,
      colorKeysCount: Array.isArray(calendar?.colorKeys) ? calendar.colorKeys.length : 0,
      daysCount: Array.isArray(calendar?.days) ? calendar.days.length : 0
    });
    return calendar;
  }

  async upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3> {
    console.log('CalendarV3 UPSERT - Saving data:', {
      userId: data.userId,
      year: data.year,
      month: data.month,
      colorKeysCount: Array.isArray(data.colorKeys) ? data.colorKeys.length : 0,
      daysCount: Array.isArray(data.days) ? data.days.length : 0
    });
    
    const [calendar] = await db
      .insert(calendarV3)
      .values({
        ...data,
        colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
        days: Array.isArray(data.days) ? data.days : [],
      })
      .onConflictDoUpdate({
        target: [calendarV3.userId, calendarV3.year, calendarV3.month],
        set: {
          colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
          days: Array.isArray(data.days) ? data.days : [],
          updatedAt: new Date(),
        },
      })
      .returning();
      
    console.log('CalendarV3 UPSERT - Save successful:', {
      id: calendar.id,
      savedColorKeys: calendar.colorKeys,
      savedDays: calendar.days
    });
    
    return calendar;
  }

  // Global Color Keys Operations
  async getGlobalColorKeys(userId: string): Promise<GlobalColorKeys | undefined> {
    console.log('GlobalColorKeys GET - Querying for userId:', userId);
    const [colorKeys] = await db
      .select()
      .from(globalColorKeys)
      .where(eq(globalColorKeys.userId, userId));
    console.log('GlobalColorKeys GET - Database result:', {
      found: !!colorKeys,
      colorKeysCount: Array.isArray(colorKeys?.colorKeys) ? colorKeys.colorKeys.length : 0
    });
    return colorKeys;
  }

  async upsertGlobalColorKeys(data: InsertGlobalColorKeys): Promise<GlobalColorKeys> {
    console.log('GlobalColorKeys UPSERT - Saving data:', {
      userId: data.userId,
      colorKeysCount: Array.isArray(data.colorKeys) ? data.colorKeys.length : 0
    });
    
    const [keys] = await db
      .insert(globalColorKeys)
      .values({
        ...data,
        colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
      })
      .onConflictDoUpdate({
        target: [globalColorKeys.userId],
        set: {
          colorKeys: Array.isArray(data.colorKeys) ? data.colorKeys : [],
          updatedAt: new Date(),
        },
      })
      .returning();
      
    console.log('GlobalColorKeys UPSERT - Save successful:', {
      id: keys.id,
      savedColorKeys: keys.colorKeys
    });
    
    return keys;
  }
}

export const storage = new DatabaseStorage();
