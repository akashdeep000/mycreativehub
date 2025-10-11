import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  unique,
  uniqueIndex,
  char,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Course access whitelist
export const courseWhitelist = pgTable("course_whitelist", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  source: varchar("source").default("systeme_webhook"), // Track where whitelist entry came from
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table - supports both Replit Auth and custom auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // For Replit Auth compatibility
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  businessTitle: varchar("business_title").default("Creative Business Owner"),
  password: varchar("password"), // For custom auth
  authProvider: varchar("auth_provider").default("custom"), // "replit" or "custom"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  hashedToken: varchar("hashed_token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_resets_user_id_idx").on(table.userId),
  index("password_resets_hashed_token_idx").on(table.hashedToken),
]);

// Password reset codes (6-digit code system)
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").notNull(),
  codeHash: char("code_hash", { length: 64 }).notNull(), // SHA-256 hex string
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  attempts: integer("attempts").default(0),
  sentCount: integer("sent_count").default(1),
  requestedIp: text("requested_ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_codes_email_expires_idx").on(table.email, table.expiresAt),
]);

// Reset sessions for two-step password reset flow
export const resetSessions = pgTable("reset_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reset_sessions_email_expires_idx").on(table.email, table.expiresAt),
]);

// Toolkit modules
export const toolkitModules = pgTable("toolkit_modules", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull(),
  color: varchar("color").notNull(),
  templateCount: integer("template_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User toolkit data
export const userToolkitData = pgTable("user_toolkit_data", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => toolkitModules.id),
  data: jsonb("data").notNull(),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily focus tasks
export const dailyFocusTasks = pgTable("daily_focus_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  task: text("task").notNull(),
  priority: varchar("priority").notNull(), // 'must', 'should', 'could'
  completed: boolean("completed").default(false),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task completion log for stats tracking
export const taskCompletionLog = pgTable("task_completion_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => dailyFocusTasks.id),
  category: varchar("category").notNull(), // 'Must Do', 'Should Do', 'Could Do'
  dateCompleted: varchar("date_completed").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueTaskDate: uniqueIndex("unique_task_date").on(table.taskId, table.dateCompleted),
}));

// Activity log
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User stats
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  completedTasks: integer("completed_tasks").default(0),
  focusHours: integer("focus_hours").default(0), // stored as minutes
  daysShowedUp: integer("days_showed_up").default(0), // unique days in current month
  currentMonth: varchar("current_month").notNull(), // YYYY-MM format
  weekStart: timestamp("week_start").notNull().defaultNow(),
  lastTaskCompletionDate: timestamp("last_task_completion_date"),
  lastDashboardAccess: timestamp("last_dashboard_access"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => toolkitModules.id),
  name: varchar("name").notNull(),
  description: text("description"),
  template: jsonb("template").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User template instances
export const userTemplateInstances = pgTable("user_template_instances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  templateId: integer("template_id").notNull().references(() => templates.id),
  name: varchar("name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard access tracking
export const dashboardAccess = pgTable("dashboard_access", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  accessDate: varchar("access_date").notNull(), // YYYY-MM-DD format
  month: varchar("month").notNull(), // YYYY-MM format
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserDate: uniqueIndex("unique_user_date").on(table.userId, table.accessDate),
}));

// Workflow template instances for the Streamline Your Workflow hub
export const workflowTemplateInstances = pgTable("workflow_template_instances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  templateType: varchar("template_type").notNull(), // 'inspiration', 'time-blocking', 'prioritization', 'manychat', 'automation'
  title: varchar("title").notNull(),
  data: jsonb("data").notNull(), // Template-specific data payload
  version: integer("version").default(1),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  lastEditedAt: timestamp("last_edited_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template files/images storage metadata
export const workflowTemplateFiles = pgTable("workflow_template_files", {
  id: serial("id").primaryKey(),
  templateInstanceId: integer("template_instance_id").notNull().references(() => workflowTemplateInstances.id),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // 'image', 'document', etc.
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Inspiration boards
export const inspirationBoards = pgTable("inspiration_boards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  backgroundColor: varchar("background_color").default("white"),
  backgroundTexture: varchar("background_texture").default("paper"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// Inspiration board images
export const inspirationBoardImages = pgTable("inspiration_board_images", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => inspirationBoards.id, { onDelete: "cascade" }),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  notes: text("notes"), // Creative notes or inspiration
  referenceUrl: varchar("reference_url"), // Reference link for the image
  tags: text("tags").array(),
  position: jsonb("position"), // { x: number, y: number, width: number, height: number }
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inspiration board notes
export const inspirationBoardNotes = pgTable("inspiration_board_notes", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => inspirationBoards.id, { onDelete: "cascade" }),
  title: varchar("title"),
  content: text("content"),
  color: varchar("color").default("yellow"), // yellow, pink, blue, lilac
  position: jsonb("position"), // { x: number, y: number, rotation: number }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Color palettes
export const colorPalettes = pgTable("color_palettes", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => inspirationBoards.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  colors: jsonb("colors").notNull(), // Array of { color: string, name?: string }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Board links/references
export const boardLinks = pgTable("board_links", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => inspirationBoards.id, { onDelete: "cascade" }),
  url: varchar("url").notNull(),
  title: varchar("title"),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social media strategy
export const socialMediaStrategies = pgTable("social_media_strategies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  contentGoals: text("content_goals"),
  pillars: jsonb("pillars").notNull(), // Array of { id: string, name: string, description: string, goals: string, cta: string }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserId: uniqueIndex("social_media_strategy_user_unique").on(table.userId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  toolkitData: many(userToolkitData),
  dailyFocusTasks: many(dailyFocusTasks),
  activityLog: many(activityLog),
  userStats: many(userStats),
  templateInstances: many(userTemplateInstances),
  workflowTemplateInstances: many(workflowTemplateInstances),
}));

export const toolkitModulesRelations = relations(toolkitModules, ({ many }) => ({
  userToolkitData: many(userToolkitData),
  templates: many(templates),
}));

export const userToolkitDataRelations = relations(userToolkitData, ({ one }) => ({
  user: one(users, {
    fields: [userToolkitData.userId],
    references: [users.id],
  }),
  module: one(toolkitModules, {
    fields: [userToolkitData.moduleId],
    references: [toolkitModules.id],
  }),
}));

export const dailyFocusTasksRelations = relations(dailyFocusTasks, ({ one }) => ({
  user: one(users, {
    fields: [dailyFocusTasks.userId],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  module: one(toolkitModules, {
    fields: [templates.moduleId],
    references: [toolkitModules.id],
  }),
  instances: many(userTemplateInstances),
}));

export const userTemplateInstancesRelations = relations(userTemplateInstances, ({ one }) => ({
  user: one(users, {
    fields: [userTemplateInstances.userId],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [userTemplateInstances.templateId],
    references: [templates.id],
  }),
}));

export const workflowTemplateInstancesRelations = relations(workflowTemplateInstances, ({ one, many }) => ({
  user: one(users, {
    fields: [workflowTemplateInstances.userId],
    references: [users.id],
  }),
  files: many(workflowTemplateFiles),
}));

export const workflowTemplateFilesRelations = relations(workflowTemplateFiles, ({ one }) => ({
  templateInstance: one(workflowTemplateInstances, {
    fields: [workflowTemplateFiles.templateInstanceId],
    references: [workflowTemplateInstances.id],
  }),
}));

export const inspirationBoardsRelations = relations(inspirationBoards, ({ one, many }) => ({
  user: one(users, {
    fields: [inspirationBoards.userId],
    references: [users.id],
  }),
  images: many(inspirationBoardImages),
  notes: many(inspirationBoardNotes),
  colorPalettes: many(colorPalettes),
  links: many(boardLinks),
}));

export const inspirationBoardImagesRelations = relations(inspirationBoardImages, ({ one }) => ({
  board: one(inspirationBoards, {
    fields: [inspirationBoardImages.boardId],
    references: [inspirationBoards.id],
  }),
}));

export const inspirationBoardNotesRelations = relations(inspirationBoardNotes, ({ one }) => ({
  board: one(inspirationBoards, {
    fields: [inspirationBoardNotes.boardId],
    references: [inspirationBoards.id],
  }),
}));

export const colorPalettesRelations = relations(colorPalettes, ({ one }) => ({
  board: one(inspirationBoards, {
    fields: [colorPalettes.boardId],
    references: [inspirationBoards.id],
  }),
}));

export const boardLinksRelations = relations(boardLinks, ({ one }) => ({
  board: one(inspirationBoards, {
    fields: [boardLinks.boardId],
    references: [inspirationBoards.id],
  }),
}));

export const socialMediaStrategiesRelations = relations(socialMediaStrategies, ({ one }) => ({
  user: one(users, {
    fields: [socialMediaStrategies.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertDailyFocusTaskSchema = createInsertSchema(dailyFocusTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.string().transform((val) => new Date(val))
});

export const insertTaskCompletionLogSchema = createInsertSchema(taskCompletionLog).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertUserToolkitDataSchema = createInsertSchema(userToolkitData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseWhitelistSchema = createInsertSchema(courseWhitelist).omit({
  id: true,
  createdAt: true,
});

export const insertUserTemplateInstanceSchema = createInsertSchema(userTemplateInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowTemplateInstanceSchema = createInsertSchema(workflowTemplateInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastEditedAt: true,
  archivedAt: true,
});

export const insertWorkflowTemplateFileSchema = createInsertSchema(workflowTemplateFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertInspirationBoardSchema = createInsertSchema(inspirationBoards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
});

export const insertInspirationBoardImageSchema = createInsertSchema(inspirationBoardImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspirationBoardNoteSchema = createInsertSchema(inspirationBoardNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertColorPaletteSchema = createInsertSchema(colorPalettes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBoardLinkSchema = createInsertSchema(boardLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSocialMediaStrategySchema = createInsertSchema(socialMediaStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Resource Library
export const resourceLibrary = pgTable("resource_library", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // "pdf" or "link"
  title: varchar("title").notNull(),
  description: text("description"),
  url: text("url"), // For external links
  fileData: text("file_data"), // Base64 encoded file for PDFs
  fileName: varchar("file_name"), // Original filename for PDFs
  fileSize: integer("file_size"), // File size in bytes
  displayOrder: integer("display_order").default(0),
  isShared: boolean("is_shared").default(false).notNull(), // Allow all users to access this resource
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Affiliate Link Tracker
export const affiliateLinks = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  productName: varchar("product_name").notNull(),
  companyName: varchar("company_name").notNull(),
  trackingLink: text("tracking_link"),
  affiliateCode: varchar("affiliate_code"),
  discountCode: varchar("discount_code"), // Discount code/coupon for users
  commissionRate: varchar("commission_rate"), // Stored as string to handle "5%" or "5-10%" formats
  cookieLength: varchar("cookie_length"), // e.g., "30 days", "60 days", "lifetime"
  contentChannel: varchar("content_channel"), // Blog, Instagram, Newsletter, etc.
  notes: text("notes"),
  status: varchar("status").notNull().default("active"), // active, expired, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResourceLibrarySchema = createInsertSchema(resourceLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetCodeSchema = createInsertSchema(passwordResetCodes).omit({
  id: true,
  createdAt: true,
});

export const insertResetSessionSchema = createInsertSchema(resetSessions).omit({
  id: true,
  createdAt: true,
});

// Types for password reset codes
export type PasswordResetCode = typeof passwordResetCodes.$inferSelect;
export type InsertPasswordResetCode = z.infer<typeof insertPasswordResetCodeSchema>;

// Types for reset sessions
export type ResetSession = typeof resetSessions.$inferSelect;
export type InsertResetSession = z.infer<typeof insertResetSessionSchema>;

// Content Creation System Tables
export const monthlyContentCalendar = pgTable("monthly_content_calendar", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  calendarData: jsonb("calendar_data").notNull().default('[]'), // Full calendar data structure - ARRAY
  colorTags: jsonb("color_tags").notNull().default('[]'), // Color tag definitions - ARRAY
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserYearMonth: uniqueIndex("unique_user_year_month").on(table.userId, table.year, table.month),
}));

export const contentBatchingPlanner = pgTable("content_batching_planner", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  posts: jsonb("posts").notNull().default('[]'), // Array of post objects
  customPillars: jsonb("custom_pillars").notNull().default('[]'), // Custom pillar options
  customPostTypes: jsonb("custom_post_types").notNull().default('[]'), // Custom post type options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contentStatusTracker = pgTable("content_status_tracker", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentItems: jsonb("content_items").notNull().default('[]'), // Array of content items
  customTypes: jsonb("custom_types").notNull().default('[]'), // Custom content types
  customPlatforms: jsonb("custom_platforms").notNull().default('[]'), // Custom platforms
  customStatuses: jsonb("custom_statuses").notNull().default('[]'), // Custom statuses
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const repurposingToolkit = pgTable("repurposing_toolkit", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  repurposingItems: jsonb("repurposing_items").notNull().default('[]'), // Array of repurposing entries
  customPlatforms: jsonb("custom_platforms").notNull().default('[]'), // Custom platform options
  customFormats: jsonb("custom_formats").notNull().default('[]'), // Custom format options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contentPerformanceStrategy = pgTable("content_performance_strategy", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentThatFeltGood: text("content_that_felt_good"),
  contentThatPerformed: text("content_that_performed"),
  whatDidntLand: text("what_didnt_land"),
  audienceReactions: text("audience_reactions"),
  strategyShifts: text("strategy_shifts"),
  nextCheckInDate: varchar("next_check_in_date"), // Date string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const performanceTrackingTable = pgTable("performance_tracking_table", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  performanceItems: jsonb("performance_items").notNull().default('[]'), // Array of performance entries
  customContentTypes: jsonb("custom_content_types").notNull().default('[]'), // Custom content types
  customPlatforms: jsonb("custom_platforms").notNull().default('[]'), // Custom platforms
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Launch System Tables
export const seasonalityTimeline = pgTable("seasonality_timeline", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  events: jsonb("events").notNull().default('[]'), // Array of timeline events
  eventTypes: jsonb("event_types").notNull().default('[]'), // Custom event type definitions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserYear: uniqueIndex("unique_user_year_seasonality").on(table.userId, table.year),
}));

export const quarterDetailPlans = pgTable("quarter_detail_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(), // 1-4
  quarterData: jsonb("quarter_data").notNull().default('{}'), // Quarter-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserYearQuarter: uniqueIndex("unique_user_year_quarter").on(table.userId, table.year, table.quarter),
}));

export const productComponentChecklists = pgTable("product_component_checklists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  products: jsonb("products").notNull().default('[]'), // Array of product objects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profitCalculator = pgTable("profit_calculator", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  savedCalculations: jsonb("saved_calculations").notNull().default('[]'), // Saved calculations library
  currency: varchar("currency").notNull().default('USD'), // Selected currency
  currentCalculation: jsonb("current_calculation").notNull().default('{}'), // Current workspace data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prelaunchTimelinePlanner = pgTable("prelaunch_timeline_planner", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  launches: jsonb("launches").notNull().default('[]'), // Store all launch objects for the user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const launchGrowthPlans = pgTable("launch_growth_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  growthPlans: jsonb("growth_plans").notNull().default('[]'), // Array of growth plan objects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Management System Tables
export const moneyMap = pgTable("money_map", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  currency: varchar("currency").notNull().default('USD'), // USD, EUR, GBP, CAD, AUD
  period: varchar("period").notNull().default('monthly'), // monthly, quarterly, yearly
  goalsData: jsonb("goals_data").notNull().default('{}'), // Goals tab data
  incomeExpensesData: jsonb("income_expenses_data").notNull().default('{}'), // Income & Expenses tab data
  savingsData: jsonb("savings_data").notNull().default('{}'), // Savings tab data
  monthlySnapshots: jsonb("monthly_snapshots").notNull().default('[]'), // Saved monthly snapshots
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserId: uniqueIndex("money_map_user_id_idx").on(table.userId),
}));

// Finance Transactions - Ledger-based transaction tracking
export const financeTransactions = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  type: varchar("type").notNull(), // 'income' or 'expense'
  category: varchar("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("finance_transactions_user_year_month_idx").on(table.userId, table.year, table.month),
  index("finance_transactions_user_date_idx").on(table.userId, table.date),
]);

// Money Map Months - Month-level metadata for finance tracking
export const moneyMapMonths = pgTable("money_map_months", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  currency: varchar("currency").notNull().default('GBP'),
  taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default('25'),
  customAllocations: jsonb("custom_allocations").notNull().default('[]'),
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  closedSnapshot: jsonb("closed_snapshot"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("money_map_months_user_year_month_idx").on(table.userId, table.year, table.month),
]);

// SOP Builder Tables
export const sopBuilders = pgTable("sop_builders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  sops: jsonb("sops").notNull().default('[]'), // Array of SOP objects with steps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automation System Toolkit Tables
export const automationToolkit = pgTable("automation_toolkit", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  promptLibrary: jsonb("prompt_library").notNull().default('[]'), // Saved prompts
  flowBuilder: jsonb("flow_builder").notNull().default('[]'), // Flow builder steps
  instagramCopies: jsonb("instagram_copies").notNull().default('[]'), // Instagram CTA copies
  prewrittenReplies: jsonb("prewritten_replies").notNull().default('{}'), // Categorized replies
  oneClickFlows: jsonb("one_click_flows").notNull().default('[]'), // One-click flow templates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Focus Timer Session Logs (already partially implemented, enhancing)
export const focusSessionLogs = pgTable("focus_session_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  task: varchar("task").notNull(),
  duration: integer("duration").notNull(), // in minutes
  completedAt: timestamp("completed_at").notNull(),
  sessionDate: varchar("session_date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables
export const insertMonthlyContentCalendarSchema = createInsertSchema(monthlyContentCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentBatchingPlannerSchema = createInsertSchema(contentBatchingPlanner).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentStatusTrackerSchema = createInsertSchema(contentStatusTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRepurposingToolkitSchema = createInsertSchema(repurposingToolkit).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentPerformanceStrategySchema = createInsertSchema(contentPerformanceStrategy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceTrackingTableSchema = createInsertSchema(performanceTrackingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSeasonalityTimelineSchema = createInsertSchema(seasonalityTimeline).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuarterDetailPlanSchema = createInsertSchema(quarterDetailPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductComponentChecklistSchema = createInsertSchema(productComponentChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfitCalculatorSchema = createInsertSchema(profitCalculator).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrelaunchTimelinePlannerSchema = createInsertSchema(prelaunchTimelinePlanner, {
  launches: z.array(z.any()),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLaunchGrowthPlanSchema = createInsertSchema(launchGrowthPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMoneyMapSchema = createInsertSchema(moneyMap).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinanceTransactionSchema = createInsertSchema(financeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMoneyMapMonthSchema = createInsertSchema(moneyMapMonths).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSopBuilderSchema = createInsertSchema(sopBuilders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationToolkitSchema = createInsertSchema(automationToolkit).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFocusSessionLogSchema = createInsertSchema(focusSessionLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type CourseWhitelist = typeof courseWhitelist.$inferSelect;
export type InsertCourseWhitelist = z.infer<typeof insertCourseWhitelistSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ToolkitModule = typeof toolkitModules.$inferSelect;
export type UserToolkitData = typeof userToolkitData.$inferSelect;
export type DailyFocusTask = typeof dailyFocusTasks.$inferSelect;
export type InsertDailyFocusTask = z.infer<typeof insertDailyFocusTaskSchema>;
export type TaskCompletionLog = typeof taskCompletionLog.$inferSelect;
export type InsertTaskCompletionLog = z.infer<typeof insertTaskCompletionLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type UserTemplateInstance = typeof userTemplateInstances.$inferSelect;
export type InsertUserTemplateInstance = z.infer<typeof insertUserTemplateInstanceSchema>;
export type WorkflowTemplateInstance = typeof workflowTemplateInstances.$inferSelect;
export type InsertWorkflowTemplateInstance = z.infer<typeof insertWorkflowTemplateInstanceSchema>;
export type WorkflowTemplateFile = typeof workflowTemplateFiles.$inferSelect;
export type InsertWorkflowTemplateFile = z.infer<typeof insertWorkflowTemplateFileSchema>;
export type InspirationBoard = typeof inspirationBoards.$inferSelect;
export type InsertInspirationBoard = z.infer<typeof insertInspirationBoardSchema>;
export type InspirationBoardImage = typeof inspirationBoardImages.$inferSelect;
export type InsertInspirationBoardImage = z.infer<typeof insertInspirationBoardImageSchema>;
export type InspirationBoardNote = typeof inspirationBoardNotes.$inferSelect;
export type InsertInspirationBoardNote = z.infer<typeof insertInspirationBoardNoteSchema>;
export type ColorPalette = typeof colorPalettes.$inferSelect;
export type InsertColorPalette = z.infer<typeof insertColorPaletteSchema>;
export type BoardLink = typeof boardLinks.$inferSelect;
export type InsertBoardLink = z.infer<typeof insertBoardLinkSchema>;
export type SocialMediaStrategy = typeof socialMediaStrategies.$inferSelect;
export type InsertSocialMediaStrategy = z.infer<typeof insertSocialMediaStrategySchema>;
export type ResourceLibraryItem = typeof resourceLibrary.$inferSelect;
export type InsertResourceLibraryItem = z.infer<typeof insertResourceLibrarySchema>;
// ResourceLibraryFolders table not implemented yet
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;

// New persistent data types
export type MonthlyContentCalendar = typeof monthlyContentCalendar.$inferSelect;
export type InsertMonthlyContentCalendar = z.infer<typeof insertMonthlyContentCalendarSchema>;
export type ContentBatchingPlanner = typeof contentBatchingPlanner.$inferSelect;
export type InsertContentBatchingPlanner = z.infer<typeof insertContentBatchingPlannerSchema>;
export type ContentStatusTracker = typeof contentStatusTracker.$inferSelect;
export type InsertContentStatusTracker = z.infer<typeof insertContentStatusTrackerSchema>;
export type RepurposingToolkit = typeof repurposingToolkit.$inferSelect;
export type InsertRepurposingToolkit = z.infer<typeof insertRepurposingToolkitSchema>;
export type ContentPerformanceStrategy = typeof contentPerformanceStrategy.$inferSelect;
export type InsertContentPerformanceStrategy = z.infer<typeof insertContentPerformanceStrategySchema>;
export type PerformanceTrackingTable = typeof performanceTrackingTable.$inferSelect;
export type InsertPerformanceTrackingTable = z.infer<typeof insertPerformanceTrackingTableSchema>;
export type SeasonalityTimeline = typeof seasonalityTimeline.$inferSelect;
export type InsertSeasonalityTimeline = z.infer<typeof insertSeasonalityTimelineSchema>;
export type QuarterDetailPlan = typeof quarterDetailPlans.$inferSelect;
export type InsertQuarterDetailPlan = z.infer<typeof insertQuarterDetailPlanSchema>;
export type ProductComponentChecklist = typeof productComponentChecklists.$inferSelect;
export type InsertProductComponentChecklist = z.infer<typeof insertProductComponentChecklistSchema>;
export type ProfitCalculator = typeof profitCalculator.$inferSelect;
export type InsertProfitCalculator = z.infer<typeof insertProfitCalculatorSchema>;
export type PrelaunchTimelinePlanner = typeof prelaunchTimelinePlanner.$inferSelect;
export type InsertPrelaunchTimelinePlanner = z.infer<typeof insertPrelaunchTimelinePlannerSchema>;
export type LaunchGrowthPlan = typeof launchGrowthPlans.$inferSelect;
export type InsertLaunchGrowthPlan = z.infer<typeof insertLaunchGrowthPlanSchema>;
export type MoneyMap = typeof moneyMap.$inferSelect;
export type InsertMoneyMap = z.infer<typeof insertMoneyMapSchema>;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type InsertFinanceTransaction = z.infer<typeof insertFinanceTransactionSchema>;
export type MoneyMapMonth = typeof moneyMapMonths.$inferSelect;
export type InsertMoneyMapMonth = z.infer<typeof insertMoneyMapMonthSchema>;
export type SopBuilder = typeof sopBuilders.$inferSelect;
export type InsertSopBuilder = z.infer<typeof insertSopBuilderSchema>;
export type AutomationToolkit = typeof automationToolkit.$inferSelect;
export type InsertAutomationToolkit = z.infer<typeof insertAutomationToolkitSchema>;
export type FocusSessionLog = typeof focusSessionLogs.$inferSelect;
export type InsertFocusSessionLog = z.infer<typeof insertFocusSessionLogSchema>;

// New Calendar V2 - Complete rebuild
export const calendarV2 = pgTable("calendar_v2", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  colorKeys: jsonb("color_keys").notNull().default('[]'),
  days: jsonb("days").notNull().default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("calendar_v2_user_year_month_idx").on(table.userId, table.year, table.month)
]);

export const insertCalendarV2Schema = createInsertSchema(calendarV2).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CalendarV2 = typeof calendarV2.$inferSelect;
export type InsertCalendarV2 = z.infer<typeof insertCalendarV2Schema>;

// Calendar V3 Types
export interface ColorKeyV3 {
  id: string;
  label: string;
  color: string;
}

export interface CalendarEntryV3 {
  id: string;
  colorKeyId: string;
  label: string;
  color: string;
  notes: string;
  time: string;
}

export interface CalendarDayV3 {
  date: string;
  entries: CalendarEntryV3[];
}

// Calendar V3 table - final rebuilt calendar system
export const calendarV3 = pgTable("calendar_v3", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  days: jsonb("days").$type<CalendarDayV3[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("calendar_v3_user_year_month_idx").on(table.userId, table.year, table.month)
]);

export const insertCalendarV3Schema = createInsertSchema(calendarV3).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CalendarV3 = typeof calendarV3.$inferSelect;
export type InsertCalendarV3 = z.infer<typeof insertCalendarV3Schema>;

// Global Color Keys - Single source of truth for color keys per user (shared across all months)
export const globalColorKeys = pgTable("global_color_keys", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGlobalColorKeysSchema = createInsertSchema(globalColorKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GlobalColorKeys = typeof globalColorKeys.$inferSelect;
export type InsertGlobalColorKeys = z.infer<typeof insertGlobalColorKeysSchema>;

// Time Blocking Color Keys - Global per user (shared across all time periods)
export const timeBlockingColorKeys = pgTable("time_blocking_color_keys", {
  userId: varchar("user_id").primaryKey().notNull().references(() => users.id),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTimeBlockingColorKeysSchema = createInsertSchema(timeBlockingColorKeys).omit({
  createdAt: true,
  updatedAt: true,
});

export type TimeBlockingColorKeys = typeof timeBlockingColorKeys.$inferSelect;
export type InsertTimeBlockingColorKeys = z.infer<typeof insertTimeBlockingColorKeysSchema>;

// Automation Prompts V2 - Conversation flow cheat sheet with 8 fields
export const automationPrompts = pgTable("automation_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  trigger: varchar("trigger").notNull(), // Trigger Word or Phrase
  automatedReply: text("automated_reply"), // Automated Replies
  openingDM: text("opening_dm"), // The Opening DM
  clickableButtonTitle: varchar("clickable_button_title"), // Clickable Button Title
  dmWithLink: text("dm_with_link"), // DM with Link
  linkTitle: varchar("link_title"), // Link Title
  linkUrl: varchar("link_url"), // Link You Will Send
  followUpDM: text("follow_up_dm"), // Follow Up DM

  // Legacy fields for migration (will be mapped to new structure)
  buttonTitle: varchar("button_title"), // Legacy - maps to clickableButtonTitle
  dmLink: text("dm_link"), // Legacy - maps to dmWithLink
  ctaButtons: varchar("cta_buttons"), // Legacy - maps to linkTitle
  followUp: text("follow_up"), // Legacy - maps to followUpDM
  bonusUpsell: text("bonus_upsell"), // Legacy - no longer used

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("automation_prompts_user_id_idx").on(table.userId),
]);

// Time Blocking Events - Proper normalized table for events
export const timeBlockingEvents = pgTable("time_blocking_events", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  color: varchar("color").notNull(),
  colorKeyId: varchar("color_key_id"),
  notes: text("notes").default(''),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("time_blocking_events_user_start_idx").on(table.userId, table.startTime),
  index("time_blocking_events_user_id_idx").on(table.userId, table.id),
]);

// V2 Insert Schema - Only includes the new 8-field structure
export const insertAutomationPromptSchema = createInsertSchema(automationPrompts).pick({
  userId: true,
  trigger: true,
  automatedReply: true,
  openingDM: true,
  clickableButtonTitle: true,
  dmWithLink: true,
  linkTitle: true,
  linkUrl: true,
  followUpDM: true,
});

// Create a V2-specific interface for the new structure
export const conversationPromptV2Schema = z.object({
  id: z.string().optional(),
  trigger: z.string(),
  automatedReply: z.string(),
  openingDM: z.string(),
  clickableButtonTitle: z.string(),
  dmWithLink: z.string(),
  linkTitle: z.string(),
  linkUrl: z.string(),
  followUpDM: z.string(),
});

export const insertTimeBlockingEventSchema = createInsertSchema(timeBlockingEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cheat Sheet Docs - Single document per user with optimistic versioning
export const cheatSheetDocs = pgTable("cheat_sheet_docs", {
  userId: varchar("user_id").primaryKey().notNull().references(() => users.id),
  data: jsonb("data").notNull(), // { version: number, rows: [{ id: string, fields: {...}, updatedAt: number }] }
  version: integer("version").notNull().default(1), // Increment on each successful save
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Simplified cheat sheet row structure (matching frontend)
export const cheatSheetRowSchema = z.object({
  trigger: z.string(),
  automatedReply: z.string(),
  openingDM: z.string(),
  buttonTitle: z.string(),
  dmWithLink: z.string(),
  linkTitle: z.string(),
  linkUrl: z.string(),
  followUpDM: z.string(),
});

export const cheatSheetDocDataSchema = z.object({
  version: z.number(),
  rows: z.array(cheatSheetRowSchema),
});

export const insertCheatSheetDocSchema = createInsertSchema(cheatSheetDocs).omit({
  createdAt: true,
  updatedAt: true,
});

export const cheatSheetDocPutBodySchema = z.object({
  version: z.number(),
  rows: z.array(cheatSheetRowSchema),
});

export type CheatSheetDoc = typeof cheatSheetDocs.$inferSelect;
export type InsertCheatSheetDoc = z.infer<typeof insertCheatSheetDocSchema>;
export type CheatSheetDocData = z.infer<typeof cheatSheetDocDataSchema>;
export type CheatSheetRow = z.infer<typeof cheatSheetRowSchema>;
export type CheatSheetDocPutBody = z.infer<typeof cheatSheetDocPutBodySchema>;

export type AutomationPrompt = typeof automationPrompts.$inferSelect;
export type InsertAutomationPrompt = z.infer<typeof insertAutomationPromptSchema>;
export type ConversationPromptV2 = z.infer<typeof conversationPromptV2Schema>;
export type TimeBlockingEvent = typeof timeBlockingEvents.$inferSelect;
export type InsertTimeBlockingEvent = z.infer<typeof insertTimeBlockingEventSchema>;
