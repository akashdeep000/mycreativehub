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
} from "drizzle-orm/pg-core";
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

// User storage table - supports both Replit Auth and custom auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // For Replit Auth compatibility
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // For custom auth
  authProvider: varchar("auth_provider").default("custom"), // "replit" or "custom"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  toolkitData: many(userToolkitData),
  dailyFocusTasks: many(dailyFocusTasks),
  activityLog: many(activityLog),
  userStats: many(userStats),
  templateInstances: many(userTemplateInstances),
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

// Insert schemas
export const insertDailyFocusTaskSchema = createInsertSchema(dailyFocusTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertUserTemplateInstanceSchema = createInsertSchema(userTemplateInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ToolkitModule = typeof toolkitModules.$inferSelect;
export type UserToolkitData = typeof userToolkitData.$inferSelect;
export type DailyFocusTask = typeof dailyFocusTasks.$inferSelect;
export type InsertDailyFocusTask = z.infer<typeof insertDailyFocusTaskSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type UserTemplateInstance = typeof userTemplateInstances.$inferSelect;
export type InsertUserTemplateInstance = z.infer<typeof insertUserTemplateInstanceSchema>;
