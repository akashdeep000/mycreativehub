import {
  courseWhitelist,
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
  passwordResets,
  passwordResetCodes,
  resetSessions,
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
  financeTransactions,
  moneyMapMonths,
  sopBuilders,
  automationToolkit,
  automationPrompts,
  focusSessionLogs,
  calendarV2,
  calendarV3,
  globalColorKeys,
  timeBlockingColorKeys,
  timeBlockingEvents,
  cheatSheetDocs,
  type CourseWhitelist,
  type InsertCourseWhitelist,
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
  type PasswordReset,
  type InsertPasswordReset,
  type PasswordResetCode,
  type InsertPasswordResetCode,
  type ResetSession,
  type InsertResetSession,
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
  type FinanceTransaction,
  type InsertFinanceTransaction,
  type MoneyMapMonth,
  type InsertMoneyMapMonth,
  type SopBuilder,
  type InsertSopBuilder,
  type AutomationToolkit,
  type InsertAutomationToolkit,
  type AutomationPrompt,
  type InsertAutomationPrompt,
  type FocusSessionLog,
  type InsertFocusSessionLog,
  type CalendarV2,
  type CalendarV3,
  type InsertCalendarV3,
  type GlobalColorKeys,
  type InsertGlobalColorKeys,
  type TimeBlockingColorKeys,
  type InsertTimeBlockingColorKeys,
  type TimeBlockingEvent,
  type InsertTimeBlockingEvent,
  type ColorKeyV3,
  type CalendarEntryV3,
  type CalendarDayV3,
  type InsertCalendarV2,
  type CheatSheetDoc,
  type InsertCheatSheetDoc,
  type CheatSheetDocData,
  type CheatSheetRow,
  type CheatSheetDocPutBody,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, inArray, isNull, gt, ne } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations - supports both Replit Auth and custom auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  
  // Course whitelist operations
  isEmailWhitelisted(email: string): Promise<boolean>;
  addEmailToWhitelist(email: string, source?: string): Promise<CourseWhitelist>;
  
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
  getResourceLibraryItem(id: number): Promise<ResourceLibraryItem | undefined>;
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
  
  // Finance Ledger (Money Map) Operations
  getMoneyMapMonth(userId: string, year: number, month: number): Promise<MoneyMapMonth | undefined>;
  upsertMoneyMapMonth(data: InsertMoneyMapMonth): Promise<MoneyMapMonth>;
  getFinanceTransactions(userId: string, year: number, month: number): Promise<FinanceTransaction[]>;
  getFinanceTransaction(id: number): Promise<FinanceTransaction | undefined>;
  createFinanceTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction>;
  updateFinanceTransaction(id: number, updates: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction>;
  deleteFinanceTransaction(id: number, userId: string): Promise<void>;
  
  // Streamline Your Workflow System
  getSopBuilder(userId: string): Promise<SopBuilder | undefined>;
  upsertSopBuilder(data: InsertSopBuilder): Promise<SopBuilder>;
  
  getAutomationToolkit(userId: string): Promise<AutomationToolkit | undefined>;
  upsertAutomationToolkit(data: InsertAutomationToolkit): Promise<AutomationToolkit>;
  
  // Automation Prompts CRUD
  getAutomationPrompts(userId: string): Promise<AutomationPrompt[]>;
  getAutomationPrompt(id: string): Promise<AutomationPrompt | undefined>;
  createAutomationPrompt(data: InsertAutomationPrompt): Promise<AutomationPrompt>;
  updateAutomationPrompt(id: string, data: Partial<InsertAutomationPrompt>): Promise<AutomationPrompt>;
  deleteAutomationPrompt(id: string): Promise<void>;
  bulkUpsertAutomationPrompts(userId: string, prompts: InsertAutomationPrompt[]): Promise<AutomationPrompt[]>;
  
  // Focus Timer System
  logFocusSession(session: InsertFocusSessionLog): Promise<FocusSessionLog>;
  getFocusSessionLogs(userId: string, limit?: number): Promise<FocusSessionLog[]>;
  
  // Calendar V2 Operations
  getCalendarV2(userId: string, year: number, month: number): Promise<CalendarV2 | undefined>;
  upsertCalendarV2(data: InsertCalendarV2): Promise<CalendarV2>;
  
  // Calendar V3 Operations
  getCalendarV3(userId: string, year: number, month: number): Promise<CalendarV3 | undefined>;
  upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3>;
  
  // Global Color Keys Operations (shared across all months)
  getGlobalColorKeys(userId: string): Promise<GlobalColorKeys | undefined>;
  upsertGlobalColorKeys(data: InsertGlobalColorKeys): Promise<GlobalColorKeys>;
  
  // Time Blocking Color Keys Operations (global per user)
  getTimeBlockingColorKeys(userId: string): Promise<TimeBlockingColorKeys | undefined>;
  upsertTimeBlockingColorKeys(data: InsertTimeBlockingColorKeys): Promise<TimeBlockingColorKeys>;
  
  // Time Blocking Events Operations
  getTimeBlockingEvents(userId: string, startDate: Date, endDate: Date): Promise<TimeBlockingEvent[]>;
  getTimeBlockingEvent(id: string): Promise<TimeBlockingEvent | undefined>;
  createTimeBlockingEvent(event: InsertTimeBlockingEvent): Promise<TimeBlockingEvent>;
  updateTimeBlockingEvent(id: string, updates: Partial<InsertTimeBlockingEvent>): Promise<TimeBlockingEvent>;
  deleteTimeBlockingEvent(id: string, userId: string): Promise<void>;
  
  // Password Reset Operations
  createPasswordResetCode(email: string, requestedIp?: string, userAgent?: string): Promise<{ code: string; record: PasswordResetCode }>;
  getPasswordResetCodeByEmail(email: string): Promise<PasswordResetCode | undefined>;
  incrementCodeAttempts(codeId: string): Promise<void>;
  verifyResetCodeAndUpdatePassword(email: string, code: string, newPasswordHash: string): Promise<{ success: boolean; message: string; user?: User }>;
  checkEmailResetRateLimit(email: string, ipAddress?: string): Promise<{ allowed: boolean; message?: string }>;
  
  // Reset Session Operations (Two-step flow)
  verifyResetCode(email: string, code: string): Promise<{ success: boolean; message: string; resetSessionId?: string }>;
  createResetSession(email: string): Promise<ResetSession>;
  getResetSession(resetSessionId: string): Promise<ResetSession | undefined>;
  completePasswordReset(resetSessionId: string, newPasswordHash: string): Promise<{ success: boolean; message: string; user?: User }>;
  
  // Cheat Sheet Document Operations (Single document per user with optimistic versioning)
  getCheatSheetDoc(userId: string): Promise<CheatSheetDoc | undefined>;
  seedCheatSheetDoc(userId: string): Promise<CheatSheetDoc>;
  updateCheatSheetDocOptimistic(userId: string, clientVersion: number, rows: CheatSheetRow[]): Promise<{ success: boolean; doc?: CheatSheetDoc; conflict?: { version: number; rows: CheatSheetRow[] } }>;
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

  // Course whitelist operations
  async isEmailWhitelisted(email: string): Promise<boolean> {
    const [result] = await db
      .select({ id: courseWhitelist.id })
      .from(courseWhitelist)
      .where(eq(courseWhitelist.email, email))
      .limit(1);
    return !!result;
  }

  async addEmailToWhitelist(email: string, source = "systeme_webhook"): Promise<CourseWhitelist> {
    const [result] = await db
      .insert(courseWhitelist)
      .values({ email, source })
      .onConflictDoNothing()
      .returning();
    
    // If no result (already exists), return the existing entry
    if (!result) {
      const [existing] = await db
        .select()
        .from(courseWhitelist)
        .where(eq(courseWhitelist.email, email));
      return existing;
    }
    
    return result;
  }

  async getToolkitModules(): Promise<ToolkitModule[]> {
    return await db.select().from(toolkitModules);
  }

  async deleteToolkitModule(moduleId: number): Promise<void> {
    await db.delete(toolkitModules).where(eq(toolkitModules.id, moduleId));
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
    // Simple upsert - no version checking, no conflicts
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

  async getResourceLibraryItem(id: number): Promise<ResourceLibraryItem | undefined> {
    const [item] = await db
      .select()
      .from(resourceLibrary)
      .where(eq(resourceLibrary.id, id))
      .limit(1);
    return item;
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

  // Finance Ledger Operations
  async getMoneyMapMonth(userId: string, year: number, month: number): Promise<MoneyMapMonth | undefined> {
    const [result] = await db
      .select()
      .from(moneyMapMonths)
      .where(
        and(
          eq(moneyMapMonths.userId, userId),
          eq(moneyMapMonths.year, year),
          eq(moneyMapMonths.month, month)
        )
      );
    return result;
  }

  async upsertMoneyMapMonth(data: InsertMoneyMapMonth): Promise<MoneyMapMonth> {
    const [result] = await db
      .insert(moneyMapMonths)
      .values(data)
      .onConflictDoUpdate({
        target: [moneyMapMonths.userId, moneyMapMonths.year, moneyMapMonths.month],
        set: {
          currency: data.currency,
          taxPercentage: data.taxPercentage,
          customAllocations: data.customAllocations,
          isClosed: data.isClosed,
          closedAt: data.closedAt,
          closedSnapshot: data.closedSnapshot,
          notes: data.notes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getFinanceTransactions(userId: string, year: number, month: number): Promise<FinanceTransaction[]> {
    const results = await db
      .select()
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.userId, userId),
          eq(financeTransactions.year, year),
          eq(financeTransactions.month, month),
          eq(financeTransactions.isDeleted, false)
        )
      )
      .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt));
    return results;
  }

  async getFinanceTransaction(id: number): Promise<FinanceTransaction | undefined> {
    const [result] = await db
      .select()
      .from(financeTransactions)
      .where(eq(financeTransactions.id, id));
    return result;
  }

  async createFinanceTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction> {
    const [result] = await db
      .insert(financeTransactions)
      .values(data)
      .returning();
    return result;
  }

  async updateFinanceTransaction(id: number, updates: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction> {
    const [result] = await db
      .update(financeTransactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(financeTransactions.id, id))
      .returning();
    return result;
  }

  async deleteFinanceTransaction(id: number, userId: string): Promise<void> {
    await db
      .update(financeTransactions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(financeTransactions.id, id),
          eq(financeTransactions.userId, userId)
        )
      );
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

  // Automation Prompts CRUD
  async getAutomationPrompts(userId: string): Promise<AutomationPrompt[]> {
    const prompts = await db
      .select()
      .from(automationPrompts)
      .where(eq(automationPrompts.userId, userId))
      .orderBy(asc(automationPrompts.createdAt));
    
    // Migrate V1 to V2 format if needed
    return prompts.map(prompt => this.migrateAutomationPromptToV2(prompt));
  }

  // Migration utility to convert V1 to V2 format
  private migrateAutomationPromptToV2(prompt: AutomationPrompt): AutomationPrompt {
    // If V2 fields are already populated, return as-is
    if (prompt.clickableButtonTitle || prompt.dmWithLink || prompt.linkTitle || prompt.linkUrl || prompt.followUpDM) {
      return prompt;
    }

    // Map V1 fields to V2 fields
    return {
      ...prompt,
      clickableButtonTitle: prompt.buttonTitle || '',
      dmWithLink: prompt.dmLink || '',
      linkTitle: prompt.ctaButtons || '',
      linkUrl: '', // New field, no legacy equivalent
      followUpDM: prompt.followUp || ''
    };
  }

  async getAutomationPrompt(id: string): Promise<AutomationPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(automationPrompts)
      .where(eq(automationPrompts.id, id));
    return prompt;
  }

  async createAutomationPrompt(data: InsertAutomationPrompt): Promise<AutomationPrompt> {
    const [prompt] = await db
      .insert(automationPrompts)
      .values(data)
      .returning();
    return prompt;
  }

  async updateAutomationPrompt(id: string, data: Partial<InsertAutomationPrompt>): Promise<AutomationPrompt> {
    const [prompt] = await db
      .update(automationPrompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(automationPrompts.id, id))
      .returning();
    return prompt;
  }

  async deleteAutomationPrompt(id: string): Promise<void> {
    await db
      .delete(automationPrompts)
      .where(eq(automationPrompts.id, id));
  }

  async bulkUpsertAutomationPrompts(userId: string, prompts: InsertAutomationPrompt[]): Promise<AutomationPrompt[]> {
    // Delete existing prompts for this user
    await db
      .delete(automationPrompts)
      .where(eq(automationPrompts.userId, userId));
    
    // Insert new prompts
    if (prompts.length === 0) {
      return [];
    }

    // Ensure V2 structure for all prompts
    const v2Prompts = prompts.map(p => ({
      ...p,
      userId,
      // Ensure V2 fields have defaults
      clickableButtonTitle: p.clickableButtonTitle || '',
      dmWithLink: p.dmWithLink || '',
      linkTitle: p.linkTitle || '',
      linkUrl: p.linkUrl || '',
      followUpDM: p.followUpDM || ''
    }));

    const result = await db
      .insert(automationPrompts)
      .values(v2Prompts)
      .returning();
    
    // Apply migration to returned results to ensure consistency
    return result.map(prompt => this.migrateAutomationPromptToV2(prompt));
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
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
        days: (Array.isArray(data.days) ? data.days : []) as any,
      })
      .onConflictDoUpdate({
        target: [calendarV3.userId, calendarV3.year, calendarV3.month],
        set: {
          colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
          days: (Array.isArray(data.days) ? data.days : []) as any,
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

  // Global Color Keys Operations (shared across all months)
  async getGlobalColorKeys(userId: string): Promise<GlobalColorKeys | undefined> {
    const [globalKeys] = await db
      .select()
      .from(globalColorKeys)
      .where(eq(globalColorKeys.userId, userId));
    
    return globalKeys;
  }

  async upsertGlobalColorKeys(data: InsertGlobalColorKeys): Promise<GlobalColorKeys> {
    const [keys] = await db
      .insert(globalColorKeys)
      .values({
        ...data,
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
      })
      .onConflictDoUpdate({
        target: [globalColorKeys.userId],
        set: {
          colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return keys;
  }

  // Time Blocking Color Keys Operations (global per user)
  async getTimeBlockingColorKeys(userId: string): Promise<TimeBlockingColorKeys | undefined> {
    const [keys] = await db
      .select()
      .from(timeBlockingColorKeys)
      .where(eq(timeBlockingColorKeys.userId, userId));
    
    return keys;
  }

  async upsertTimeBlockingColorKeys(data: InsertTimeBlockingColorKeys): Promise<TimeBlockingColorKeys> {
    const [keys] = await db
      .insert(timeBlockingColorKeys)
      .values({
        ...data,
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
      })
      .onConflictDoUpdate({
        target: [timeBlockingColorKeys.userId],
        set: {
          colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return keys;
  }

  // Time Blocking Events Operations
  async getTimeBlockingEvents(userId: string, startDate: Date, endDate: Date): Promise<TimeBlockingEvent[]> {
    const events = await db
      .select()
      .from(timeBlockingEvents)
      .where(
        and(
          eq(timeBlockingEvents.userId, userId),
          gte(timeBlockingEvents.startTime, startDate),
          lte(timeBlockingEvents.startTime, endDate),
          isNull(timeBlockingEvents.deletedAt)
        )
      )
      .orderBy(asc(timeBlockingEvents.startTime));
    
    return events;
  }

  async getTimeBlockingEvent(id: string): Promise<TimeBlockingEvent | undefined> {
    const [event] = await db
      .select()
      .from(timeBlockingEvents)
      .where(
        and(
          eq(timeBlockingEvents.id, id),
          isNull(timeBlockingEvents.deletedAt)
        )
      );
    
    return event;
  }

  async createTimeBlockingEvent(eventData: InsertTimeBlockingEvent): Promise<TimeBlockingEvent> {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert string timestamps to Date objects if needed
    const startTime = typeof eventData.startTime === 'string' ? new Date(eventData.startTime) : eventData.startTime;
    const endTime = typeof eventData.endTime === 'string' ? new Date(eventData.endTime) : eventData.endTime;
    
    const [event] = await db
      .insert(timeBlockingEvents)
      .values({
        ...eventData,
        id: eventId,
        startTime,
        endTime,
      })
      .returning();
    
    return event;
  }

  async updateTimeBlockingEvent(id: string, updates: Partial<InsertTimeBlockingEvent>): Promise<TimeBlockingEvent> {
    // Convert string timestamps to Date objects if needed (same as create function)
    const processedUpdates = { ...updates };
    if (updates.startTime && typeof updates.startTime === 'string') {
      processedUpdates.startTime = new Date(updates.startTime);
    }
    if (updates.endTime && typeof updates.endTime === 'string') {
      processedUpdates.endTime = new Date(updates.endTime);
    }
    
    const [event] = await db
      .update(timeBlockingEvents)
      .set({
        ...processedUpdates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(timeBlockingEvents.id, id),
          isNull(timeBlockingEvents.deletedAt)
        )
      )
      .returning();
    
    if (!event) {
      throw new Error('Event not found or already deleted');
    }
    
    return event;
  }

  async deleteTimeBlockingEvent(id: string, userId: string): Promise<void> {
    const result = await db
      .update(timeBlockingEvents)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(timeBlockingEvents.id, id),
          eq(timeBlockingEvents.userId, userId),
          isNull(timeBlockingEvents.deletedAt)
        )
      );
    
    console.log(`Time blocking event ${id} soft deleted for user ${userId}`);
  }

  // Old token-based password reset methods removed - now using 6-digit code system

  // Password Reset Code Operations (6-digit system)
  async createPasswordResetCode(email: string, requestedIp?: string, userAgent?: string): Promise<{ code: string; record: PasswordResetCode }> {
    // Generate 6-digit code with leading zeros
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    
    // Hash the code for storage using SHA-256
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Optional: Clean up old unused codes for this email
    await db
      .delete(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, email.toLowerCase().trim()),
          isNull(passwordResetCodes.usedAt)
        )
      );
    
    // Create password reset code record
    const [passwordResetCode] = await db.insert(passwordResetCodes).values({
      id: nanoid(),
      email: email.toLowerCase().trim(),
      codeHash,
      expiresAt,
      requestedIp,
      userAgent,
    }).returning();
    
    return {
      code, // Return the plain code for email sending
      record: passwordResetCode
    };
  }

  async getPasswordResetCodeByEmail(email: string): Promise<PasswordResetCode | undefined> {
    const [passwordResetCode] = await db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, email.toLowerCase().trim()),
          isNull(passwordResetCodes.usedAt), // Only get unused codes
          gt(passwordResetCodes.expiresAt, new Date()) // Only get non-expired codes
        )
      )
      .orderBy(desc(passwordResetCodes.createdAt)) // Get most recent
      .limit(1);
    
    return passwordResetCode;
  }

  async incrementCodeAttempts(codeId: string): Promise<void> {
    await db
      .update(passwordResetCodes)
      .set({ 
        attempts: sql`${passwordResetCodes.attempts} + 1`
      })
      .where(eq(passwordResetCodes.id, codeId));
  }

  async verifyResetCodeAndUpdatePassword(email: string, code: string, newPasswordHash: string): Promise<{ success: boolean; message: string; user?: User }> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find the most recent unused code for this email
    const passwordResetCode = await this.getPasswordResetCodeByEmail(normalizedEmail);
    
    if (!passwordResetCode) {
      return { success: false, message: "Code invalid or expired" };
    }
    
    // Check if too many attempts (5+ attempts locks for 10 minutes)
    if ((passwordResetCode.attempts ?? 0) >= 5) {
      const lockoutTime = new Date((passwordResetCode.createdAt ?? new Date()).getTime() + 10 * 60 * 1000); // 10 minutes from creation
      if (new Date() < lockoutTime) {
        return { success: false, message: "Too many attempts. Please try again later." };
      }
    }
    
    // Hash the provided code for comparison
    const providedCodeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Constant-time comparison using Node.js crypto
    const isValidCode = crypto.timingSafeEqual(
      Buffer.from(passwordResetCode.codeHash, 'hex'),
      Buffer.from(providedCodeHash, 'hex')
    );
    
    if (!isValidCode) {
      // Increment attempts on invalid code
      await this.incrementCodeAttempts(passwordResetCode.id);
      return { success: false, message: "Code invalid or expired" };
    }
    
    // Check if code is expired
    const now = new Date();
    if (now > passwordResetCode.expiresAt) {
      return { success: false, message: "Code invalid or expired" };
    }
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Update user's password
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();
    
    // Mark the code as used
    await db
      .update(passwordResetCodes)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetCodes.id, passwordResetCode.id));
    
    // Clean up any other pending codes for this email
    await db
      .delete(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, normalizedEmail),
          isNull(passwordResetCodes.usedAt),
          ne(passwordResetCodes.id, passwordResetCode.id) // Don't delete the one we just used
        )
      );
    
    return { 
      success: true, 
      message: "Password reset successfully",
      user: updatedUser 
    };
  }

  async checkEmailResetRateLimit(email: string, ipAddress?: string): Promise<{ allowed: boolean; message?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check email rate limit (5 per hour)
    const emailCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, normalizedEmail),
          gt(passwordResetCodes.createdAt, oneHourAgo)
        )
      );
    
    if (emailCount[0]?.count >= 5) {
      return { allowed: false, message: "Too many reset attempts. Please try again later." };
    }
    
    // Check IP rate limit if provided (5 per hour)
    if (ipAddress) {
      const ipCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(passwordResetCodes)
        .where(
          and(
            eq(passwordResetCodes.requestedIp, ipAddress),
            gt(passwordResetCodes.createdAt, oneHourAgo)
          )
        );
      
      if (ipCount[0]?.count >= 5) {
        return { allowed: false, message: "Too many reset attempts from this location. Please try again later." };
      }
    }
    
    // Check cooldown (60 seconds since last request for this email)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, normalizedEmail),
          gt(passwordResetCodes.createdAt, oneMinuteAgo)
        )
      );
    
    if (recentCount[0]?.count > 0) {
      return { allowed: false, message: "Please wait 60 seconds before requesting another code." };
    }
    
    return { allowed: true };
  }

  // Reset Session Operations (Two-step flow)
  async verifyResetCode(email: string, code: string): Promise<{ success: boolean; message: string; resetSessionId?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find the most recent unused code for this email
    const passwordResetCode = await this.getPasswordResetCodeByEmail(normalizedEmail);
    
    if (!passwordResetCode) {
      return { success: false, message: "invalid_code" };
    }
    
    // Check if too many attempts (5+ attempts locks for 10 minutes)
    if ((passwordResetCode.attempts ?? 0) >= 5) {
      const lockoutTime = new Date((passwordResetCode.createdAt ?? new Date()).getTime() + 10 * 60 * 1000); // 10 minutes from creation
      if (new Date() < lockoutTime) {
        return { success: false, message: "too_many_attempts" };
      }
    }
    
    // Hash the provided code for comparison
    const providedCodeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Constant-time comparison using Node.js crypto
    const isValidCode = crypto.timingSafeEqual(
      Buffer.from(passwordResetCode.codeHash, 'hex'),
      Buffer.from(providedCodeHash, 'hex')
    );
    
    if (!isValidCode) {
      // Increment attempts on invalid code
      await this.incrementCodeAttempts(passwordResetCode.id);
      return { success: false, message: "invalid_code" };
    }
    
    // Check if code is expired
    const now = new Date();
    if (now > passwordResetCode.expiresAt) {
      return { success: false, message: "expired_code" };
    }
    
    // Find user by email to ensure they exist
    const user = await this.getUserByEmail(normalizedEmail);
    if (!user) {
      return { success: false, message: "invalid_code" };
    }
    
    // Mark the code as used
    await db
      .update(passwordResetCodes)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetCodes.id, passwordResetCode.id));
    
    // Create reset session
    const resetSession = await this.createResetSession(normalizedEmail);
    
    return { 
      success: true, 
      message: "Code verified successfully",
      resetSessionId: resetSession.id 
    };
  }

  async createResetSession(email: string): Promise<ResetSession> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Clean up any existing unused reset sessions for this email
    await db
      .delete(resetSessions)
      .where(
        and(
          eq(resetSessions.email, normalizedEmail),
          eq(resetSessions.used, false)
        )
      );
    
    // Create new reset session (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const [resetSession] = await db.insert(resetSessions).values({
      email: normalizedEmail,
      expiresAt,
      used: false,
    }).returning();
    
    return resetSession;
  }

  async getResetSession(resetSessionId: string): Promise<ResetSession | undefined> {
    const [resetSession] = await db
      .select()
      .from(resetSessions)
      .where(
        and(
          eq(resetSessions.id, resetSessionId),
          eq(resetSessions.used, false),
          gt(resetSessions.expiresAt, new Date()) // Only get non-expired sessions
        )
      )
      .limit(1);
    
    return resetSession;
  }

  async completePasswordReset(resetSessionId: string, newPasswordHash: string): Promise<{ success: boolean; message: string; user?: User }> {
    // Find and validate reset session
    const resetSession = await this.getResetSession(resetSessionId);
    
    if (!resetSession) {
      return { success: false, message: "Reset session invalid or expired" };
    }
    
    // Find user by email
    const user = await this.getUserByEmail(resetSession.email);
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Update user's password
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();
    
    // Mark the reset session as used
    await db
      .update(resetSessions)
      .set({ used: true })
      .where(eq(resetSessions.id, resetSessionId));
    
    // Clean up any other pending reset sessions for this email
    await db
      .delete(resetSessions)
      .where(
        and(
          eq(resetSessions.email, resetSession.email),
          ne(resetSessions.id, resetSessionId)
        )
      );
    
    return { 
      success: true, 
      message: "Password reset successfully",
      user: updatedUser 
    };
  }

  // Cheat Sheet Document Operations (Single document per user with optimistic versioning)
  async getCheatSheetDoc(userId: string): Promise<CheatSheetDoc | undefined> {
    const [doc] = await db
      .select()
      .from(cheatSheetDocs)
      .where(eq(cheatSheetDocs.userId, userId))
      .limit(1);
    return doc;
  }

  async seedCheatSheetDoc(userId: string): Promise<CheatSheetDoc> {
    const defaultRow: CheatSheetRow = {
      trigger: "",
      automatedReply: "",
      openingDM: "",
      buttonTitle: "",
      dmWithLink: "",
      linkTitle: "",
      linkUrl: "",
      followUpDM: "",
    };

    const defaultData: CheatSheetDocData = {
      version: 1,
      rows: [defaultRow],
    };

    const [doc] = await db
      .insert(cheatSheetDocs)
      .values({
        userId,
        data: defaultData,
        version: 1,
      })
      .onConflictDoNothing()
      .returning();

    // If no result (already exists), return the existing entry
    if (!doc) {
      const existing = await this.getCheatSheetDoc(userId);
      if (existing) return existing;
      throw new Error("Failed to seed cheat sheet doc");
    }

    return doc;
  }

  async updateCheatSheetDocOptimistic(
    userId: string,
    clientVersion: number,
    rows: CheatSheetRow[]
  ): Promise<{ success: boolean; doc?: CheatSheetDoc; conflict?: { version: number; rows: CheatSheetRow[] } }> {
    // Get current document
    const currentDoc = await this.getCheatSheetDoc(userId);
    
    if (!currentDoc) {
      // No document exists, this shouldn't happen but handle gracefully
      const seededDoc = await this.seedCheatSheetDoc(userId);
      return { success: false, conflict: { version: seededDoc.version, rows: (seededDoc.data as CheatSheetDocData).rows } };
    }

    const currentData = currentDoc.data as CheatSheetDocData;

    // Check for version conflict
    if (clientVersion < currentData.version) {
      return { 
        success: false, 
        conflict: { 
          version: currentData.version, 
          rows: currentData.rows 
        } 
      };
    }

    // Use the rows directly since they already have the correct structure
    const updatedRows = rows;

    const newVersion = currentData.version + 1;
    const newData: CheatSheetDocData = {
      version: newVersion,
      rows: updatedRows,
    };

    try {
      const [updatedDoc] = await db
        .update(cheatSheetDocs)
        .set({
          data: newData,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(and(
          eq(cheatSheetDocs.userId, userId),
          eq(cheatSheetDocs.version, currentData.version) // Ensure version hasn't changed
        ))
        .returning();

      if (!updatedDoc) {
        // Version conflict - someone else updated between our read and write
        const latestDoc = await this.getCheatSheetDoc(userId);
        if (latestDoc) {
          const latestData = latestDoc.data as CheatSheetDocData;
          return { 
            success: false, 
            conflict: { 
              version: latestData.version, 
              rows: latestData.rows 
            } 
          };
        }
      }

      return { success: true, doc: updatedDoc };
    } catch (error) {
      console.error("Error updating cheat sheet doc:", error);
      // In case of any error, return current state as conflict
      return { 
        success: false, 
        conflict: { 
          version: currentData.version, 
          rows: currentData.rows 
        } 
      };
    }
  }
}

export const storage = new DatabaseStorage();
