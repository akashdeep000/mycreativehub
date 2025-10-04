import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession } from "./customAuth";
import { generateToken, jwtAuth, hashPassword, comparePassword } from "./jwtAuth";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { Resend } from "resend";
import { insertDailyFocusTaskSchema, insertActivityLogSchema, insertUserTemplateInstanceSchema, cheatSheetDocPutBodySchema } from "@shared/schema";
import { db } from "./db";
import { inspirationBoards } from "@shared/schema";

// Standardize environment variable reads
const RESEND_KEY = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;

// Boot-time logging (exactly as specified)
console.log('[boot] email cfg', { hasKey: !!RESEND_KEY, from: process.env.EMAIL_FROM });

// Initialize Resend client
const resend = new Resend(RESEND_KEY);

// Old sendPasswordResetEmail function removed - now using sendPasswordResetCodeEmail for 6-digit codes

// Send password reset code email (6-digit system)
const sendPasswordResetCodeEmail = async (email: string, code: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [email],
      subject: `Your MyCreativeHub reset code: ${code}`,
      html: `
        <p>Your reset code is: <strong>${code}</strong></p>
        <p>Go back to the app and enter this code to set a new password.</p>
      `,
      text: `Your reset code is: ${code}

Go back to the app and enter this code to set a new password.`
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    console.log('Password reset code email sent successfully:', { id: data?.id });
    return data;
  } catch (error) {
    console.error('Error sending password reset code email:', error);
    throw error;
  }
};

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
  // Diagnostic test route for email sending (development only)
  app.get('/debug/send-test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    try {
      const to = String(req.query.to || '').trim().toLowerCase();
      if (!to) {
        return res.status(400).json({ ok: false, error: 'Email required' });
      }
      
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to,
        subject: 'Test — MyCreativeHub',
        text: 'This is a Resend test.'
      });
      return res.json({ ok: true, providerId: result?.data?.id || null });
    } catch (e: any) {
      console.error('send-test error:', e?.message || e);
      return res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Session middleware
  app.use(getSession());

  // Legacy route (removed - now using 6-digit code system)

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      // Check if email is whitelisted first
      const isWhitelisted = await storage.isEmailWhitelisted(email);
      if (!isWhitelisted) {
        return res.status(403).json({ 
          message: "Access is restricted to course members only. Please purchase the course to gain access.",
          accessDenied: true
        });
      }
      
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
      
      // Set httpOnly cookie with environment-specific settings
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: isProduction ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 30 days for preview
        path: '/',
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
      
      // Check if email is whitelisted first
      const isWhitelisted = await storage.isEmailWhitelisted(email);
      if (!isWhitelisted) {
        console.log("Login - Email not whitelisted:", email);
        return res.status(403).json({ 
          message: "Access is restricted to course members only. Please purchase the course to gain access.",
          accessDenied: true
        });
      }
      
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
      
      // Set httpOnly cookie with environment-specific settings
      console.log("Login - Setting httpOnly cookie");
      console.log("Login - Cookie secure flag:", process.env.NODE_ENV === 'production');
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' as const : 'lax' as const, // Use 'lax' for preview environment
        maxAge: isProduction ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 30 days for preview
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
    res.clearCookie('authToken', { path: '/' });
    res.json({ message: "Logged out successfully" });
  });

  // Clear expired tokens endpoint for preview environment
  app.post('/api/auth/clear-expired', (req, res) => {
    console.log("Clear expired - Clearing all auth cookies and localStorage");
    res.clearCookie('authToken', { path: '/' });
    res.json({ message: "Expired tokens cleared successfully" });
  });

  app.get('/api/auth/user', jwtAuth, async (req, res) => {
    try {
      console.log("Auth check - User from middleware:", req.user?.email);
      const user = req.user;
      if (!user) {
        console.log("Auth check - No user in middleware");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user's email is still whitelisted
      const isWhitelisted = await storage.isEmailWhitelisted(user.email);
      if (!isWhitelisted) {
        console.log("Auth check - User not whitelisted:", user.email);
        return res.status(403).json({ 
          message: "Access is restricted to course members only. Please purchase the course to gain access.",
          accessDenied: true
        });
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

  // Update user business title
  app.patch('/api/auth/user/business-title', jwtAuth, async (req: any, res) => {
    try {
      const { businessTitle } = req.body;
      const userId = req.user.id;
      
      if (!businessTitle || typeof businessTitle !== 'string') {
        return res.status(400).json({ message: "Valid business title is required" });
      }
      
      // Update the user's business title
      const updatedUser = await storage.updateUser(userId, { businessTitle: businessTitle.trim() });
      
      console.log(`Updated business title for user ${userId}: ${businessTitle}`);
      
      // Return updated user (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating business title:", error);
      res.status(500).json({ message: "Failed to update business title" });
    }
  });

  // Update user profile
  app.patch('/api/auth/user/profile', jwtAuth, async (req: any, res) => {
    try {
      const { firstName, lastName, businessTitle } = req.body;
      const userId = req.user.id;
      
      if (!firstName || !lastName || !businessTitle) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Update the user's profile
      const updatedUser = await storage.updateUser(userId, { 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        businessTitle: businessTitle.trim() 
      });
      
      console.log(`Updated profile for user ${userId}: ${firstName} ${lastName}, ${businessTitle}`);
      
      // Return updated user (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user profile image
  app.patch('/api/auth/user/profile-image', jwtAuth, async (req: any, res) => {
    try {
      const { profileImageUrl } = req.body;
      const userId = req.user.id;
      
      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }
      
      // Update the user's profile image
      const updatedUser = await storage.updateUser(userId, { 
        profileImageUrl: profileImageUrl 
      });
      
      console.log(`Updated profile image for user ${userId}`);
      
      // Return updated user (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });

  // Update user password
  app.patch('/api/auth/user/password', jwtAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get current user to verify password
      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.password) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(userId, { password: hashedNewPassword });
      
      console.log(`Updated password for user ${userId}`);
      
      // Return success message (don't send back user data for security)
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Diagnostic route (proves Resend works now)
  // GET /debug/send-test?to=<email>
  app.get('/debug/send-test', async (req, res) => {
    try {
      const to = String(req.query.to || '').trim().toLowerCase();
      const r = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to,
        subject: 'Test — MyCreativeHub',
        text: 'This is a Resend connectivity test.'
      });
      console.log('[send-test] provider id:', r?.data?.id || null);
      return res.json({ ok: true, id: r?.data?.id || null });
    } catch (e: any) {
      console.error('[send-test] error:', e?.message || e);
      return res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // POST /api/auth/request-reset { email }
  app.post('/api/auth/request-reset', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      console.log('[request-reset] hit', { email });

      // Check if user exists (but don't leak this information)
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate and store reset code
        const resetCode = await storage.createPasswordResetCode(email);
        console.log('[request-reset] code generated', { email, codeLength: resetCode.code.length });
        
        // Send email with code
        try {
          await sendPasswordResetCodeEmail(email, resetCode.code);
          console.log('[request-reset] email sent successfully');
        } catch (emailError) {
          console.error('[request-reset] email failed', emailError);
          // Don't fail the request even if email fails - prevents user enumeration
        }
      } else {
        console.log('[request-reset] user not found, but returning success to prevent enumeration');
      }

      // Always return success to prevent user enumeration
      return res.json({ ok: true });
    } catch (e: any) {
      console.error('[request-reset] error', e?.message || e);
      return res.json({ ok: true }); // still generic 200
    }
  });


  // POST /auth/confirm-reset { email, code, newPassword }
  app.post('/auth/confirm-reset', async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      // Validate input
      if (!email || !code || !newPassword) {
        return res.status(400).json({ 
          ok: false, 
          error: 'invalid_input',
          message: 'Email, code, and new password are required' 
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedCode = String(code).trim();

      // Validate code format (6 digits)
      if (!/^\d{6}$/.test(normalizedCode)) {
        return res.status(400).json({ 
          ok: false, 
          error: 'invalid_code',
          message: 'Code must be 6 digits' 
        });
      }

      console.log('[confirm-reset] attempting reset', { email: normalizedEmail });

      // Verify code and update password using storage method
      const result = await storage.verifyResetCodeAndUpdatePassword(
        normalizedEmail,
        normalizedCode, 
        newPassword
      );

      if (result.success) {
        console.log('[confirm-reset] password reset successful');
        return res.json({ ok: true, message: 'Password reset successful' });
      } else {
        console.log('[confirm-reset] failed:', result.message);
        
        // Map storage errors to user-friendly messages
        let userMessage = 'That code isn\'t right. Please try again.';
        let errorType = 'invalid_code';
        
        if (result.message.includes('Too many attempts')) {
          userMessage = 'Too many tries. Please wait a few minutes and request a new code.';
          errorType = 'too_many_attempts';
        } else if (result.message.includes('invalid') || result.message.includes('expired')) {
          userMessage = 'That code isn\'t right. Please try again.';
          errorType = 'invalid_code';
        }
        
        return res.status(400).json({ 
          ok: false, 
          error: errorType,
          message: userMessage 
        });
      }
    } catch (e: any) {
      console.error('[confirm-reset] error', e?.message || e);
      return res.status(500).json({ 
        ok: false, 
        error: 'server_error',
        message: 'An error occurred. Please try again.' 
      });
    }
  });

  // POST /api/auth/verify-reset-code { email, code }
  app.post('/api/auth/verify-reset-code', async (req, res) => {
    try {
      const { email, code } = req.body;
      
      // Validate input
      if (!email || !code) {
        return res.status(400).json({ 
          ok: false, 
          error: 'invalid_input',
          message: 'Email and code are required' 
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedCode = String(code).trim();

      console.log('[verify-reset-code] attempting verification', { email: normalizedEmail });

      // Verify code and create reset session
      const result = await storage.verifyResetCode(normalizedEmail, normalizedCode);

      if (result.success) {
        console.log('[verify-reset-code] code verified successfully');
        return res.json({ 
          ok: true, 
          resetSessionId: result.resetSessionId 
        });
      } else {
        console.log('[verify-reset-code] verification failed:', result.message);
        
        // Map storage errors to user-friendly messages
        let userMessage = 'Invalid or expired code. Please try again.';
        let errorType = result.message;
        
        if (result.message === 'too_many_attempts') {
          userMessage = 'Too many attempts. Please wait and request a new code.';
        } else if (result.message === 'expired_code') {
          userMessage = 'Code has expired. Please request a new one.';
        } else if (result.message === 'invalid_code') {
          userMessage = 'Invalid code. Please check and try again.';
        }
        
        return res.status(400).json({ 
          ok: false, 
          error: errorType,
          message: userMessage 
        });
      }
    } catch (e: any) {
      console.error('[verify-reset-code] error', e?.message || e);
      return res.status(500).json({ 
        ok: false, 
        error: 'server_error',
        message: 'An error occurred. Please try again.' 
      });
    }
  });

  // POST /api/auth/complete-reset { resetSessionId, newPassword }
  app.post('/api/auth/complete-reset', async (req, res) => {
    try {
      const { resetSessionId, newPassword } = req.body;
      
      // Validate input
      if (!resetSessionId || !newPassword) {
        return res.status(400).json({ 
          ok: false, 
          error: 'invalid_input',
          message: 'Reset session ID and new password are required' 
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          ok: false, 
          error: 'weak_password',
          message: 'Password must be at least 6 characters long' 
        });
      }

      // Hash password using the same method as signup/login
      const hashedPassword = await hashPassword(newPassword);

      console.log('[complete-reset] attempting password reset', { resetSessionId });

      // Complete password reset using storage method
      const result = await storage.completePasswordReset(resetSessionId, hashedPassword);

      if (result.success) {
        console.log('[complete-reset] password reset successful');
        return res.json({ ok: true, message: 'Password updated successfully' });
      } else {
        console.log('[complete-reset] failed:', result.message);
        
        return res.status(400).json({ 
          ok: false, 
          error: 'session_invalid',
          message: 'Reset session invalid or expired. Please start over.' 
        });
      }
    } catch (e: any) {
      console.error('[complete-reset] error', e?.message || e);
      return res.status(500).json({ 
        ok: false, 
        error: 'server_error',
        message: 'An error occurred. Please try again.' 
      });
    }
  });

  // Legacy routes removed (now using 6-digit code system)

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
  app.get('/api/daily-focus', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`Fetching daily focus tasks for userId: ${userId}`);
      
      const tasks = await storage.getDailyFocusTasks(userId);
      console.log(`Retrieved ${tasks.length} tasks:`, tasks);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching daily focus tasks:", error);
      res.status(500).json({ message: "Failed to fetch daily focus tasks" });
    }
  });

  app.post('/api/daily-focus', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`Creating daily focus task for userId: ${userId}`);
      console.log(`Request body:`, req.body);
      
      const taskData = insertDailyFocusTaskSchema.parse({
        ...req.body,
        userId,
      });
      console.log(`Parsed task data:`, taskData);
      
      const task = await storage.createDailyFocusTask(taskData);
      console.log(`Created task:`, task);
      
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
      
      // Log task completion for stats tracking
      if (completed) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const categoryMap = {
          'must': 'Must Do',
          'should': 'Should Do', 
          'could': 'Could Do'
        };
        
        try {
          await storage.logTaskCompletion({
            userId,
            taskId: task.id,
            category: categoryMap[task.priority as keyof typeof categoryMap],
            dateCompleted: today
          });
        } catch (error) {
          // Ignore duplicate errors - task already logged for this date
          console.log('Task completion already logged for this date');
        }
      }
      
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

  // Edit task text (PUT)
  app.put('/api/daily-focus/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.id);
      const { task } = req.body;
      
      // Check if task exists and belongs to user
      const existingTask = await storage.getDailyFocusTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (existingTask.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedTask = await storage.updateDailyFocusTaskText(taskId, task);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'task_edited',
        description: `Edited task: ${task}`,
        metadata: { taskId: updatedTask.id, priority: updatedTask.priority },
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error editing daily focus task:", error);
      res.status(500).json({ message: "Failed to edit daily focus task" });
    }
  });

  // Delete individual daily task
  app.delete('/api/daily-focus/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.id);
      
      // Check if task exists and belongs to user
      const task = await storage.getDailyFocusTask(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (task.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteDailyFocusTask(taskId);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'task_deleted',
        description: `Deleted task: ${task.task}`,
        metadata: { taskId, priority: task.priority },
      });
      
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Clear all daily tasks
  app.delete('/api/daily-focus/clear-all', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await storage.clearDailyFocusTasks(userId);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'tasks_cleared',
        description: 'Cleared all daily focus tasks',
        metadata: {},
      });
      
      res.json({ message: 'All daily tasks cleared successfully' });
    } catch (error) {
      console.error("Error clearing daily tasks:", error);
      res.status(500).json({ message: "Failed to clear daily tasks" });
    }
  });

  // Get monthly task completions
  app.get('/api/task-completions/:year/:month', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const completions = await storage.getMonthlyTaskCompletions(userId, year, month);
      res.json({ completions });
    } catch (error) {
      console.error("Error fetching monthly task completions:", error);
      res.status(500).json({ message: "Failed to fetch monthly task completions" });
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
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Get monthly task completions from log
      const monthlyCompletions = await storage.getMonthlyTaskCompletions(userId, currentYear, currentMonth);
      
      // Override completedTasks with monthly data
      const updatedStats = {
        ...(stats || { completedTasks: 0, focusHours: 0, daysShowedUp: 0 }),
        completedTasks: monthlyCompletions
      };
      
      res.json(updatedStats);
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

  // Get upload URL for board image
  app.post('/api/inspiration-boards/:id/upload', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
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
      
      // Normalize the image URL if it's from object storage
      let { imageUrl } = req.body;
      if (imageUrl && imageUrl.startsWith('https://storage.googleapis.com/')) {
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        imageUrl = objectStorageService.normalizeObjectEntityPath(imageUrl);
      }
      
      const image = await storage.createBoardImage({
        boardId: parseInt(id),
        ...req.body,
        imageUrl,
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

  app.delete('/api/inspiration-boards/:id/images/:imageId', jwtAuth, async (req: any, res) => {
    try {
      const { id, imageId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      await storage.deleteBoardImage(parseInt(imageId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting board image:", error);
      res.status(500).json({ message: "Failed to delete board image" });
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

  app.patch('/api/inspiration-boards/:id/notes/:noteId', jwtAuth, async (req: any, res) => {
    try {
      const { id, noteId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const updatedNote = await storage.updateBoardNote(parseInt(noteId), req.body);
      if (!updatedNote) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating board note:", error);
      res.status(500).json({ message: "Failed to update board note" });
    }
  });

  app.delete('/api/inspiration-boards/:id/notes/:noteId', jwtAuth, async (req: any, res) => {
    try {
      const { id, noteId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      await storage.deleteBoardNote(parseInt(noteId));
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting board note:", error);
      res.status(500).json({ message: "Failed to delete board note" });
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

  app.patch('/api/inspiration-boards/:id/palettes/:paletteId', jwtAuth, async (req: any, res) => {
    try {
      const { id, paletteId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const palette = await storage.updateColorPalette(parseInt(paletteId), req.body);
      res.json(palette);
    } catch (error) {
      console.error("Error updating color palette:", error);
      res.status(500).json({ message: "Failed to update color palette" });
    }
  });

  app.delete('/api/inspiration-boards/:id/palettes/:paletteId', jwtAuth, async (req: any, res) => {
    try {
      const { id, paletteId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      await storage.deleteColorPalette(parseInt(paletteId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting color palette:", error);
      res.status(500).json({ message: "Failed to delete color palette" });
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

  app.patch('/api/inspiration-boards/:id/links/:linkId', jwtAuth, async (req: any, res) => {
    try {
      const { id, linkId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const link = await storage.updateBoardLink(parseInt(linkId), req.body);
      res.json(link);
    } catch (error) {
      console.error("Error updating board link:", error);
      res.status(500).json({ message: "Failed to update board link" });
    }
  });

  app.delete('/api/inspiration-boards/:id/links/:linkId', jwtAuth, async (req: any, res) => {
    try {
      const { id, linkId } = req.params;
      const board = await storage.getInspirationBoard(parseInt(id));
      
      if (!board || board.userId !== req.user.id) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      await storage.deleteBoardLink(parseInt(linkId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting board link:", error);
      res.status(500).json({ message: "Failed to delete board link" });
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
        description: 'focus',
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
      
      // Return null if no strategy exists OR if all content is empty
      if (!strategy) {
        return res.json(null);
      }
      
      // Check if there's any actual content
      const hasContentGoals = strategy.contentGoals && strategy.contentGoals.trim();
      const hasPillarContent = strategy.pillars && Array.isArray(strategy.pillars) && strategy.pillars.some((p: any) => 
        (p.title && p.title.trim()) || (p.cta && p.cta.trim())
      );
      
      // Only return data if there's actual content, otherwise return null
      if (!hasContentGoals && !hasPillarContent) {
        return res.json(null);
      }
      
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
      const userId = req.user.id;
      const { id } = req.params;
      const itemId = parseInt(id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      // Check if item exists and verify ownership
      const existingItem = await storage.getResourceLibraryItem(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (existingItem.userId !== userId) {
        return res.status(403).json({ message: "Access denied: You can only update your own items" });
      }
      
      const item = await storage.updateResourceLibraryItem(itemId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating resource library item:", error);
      res.status(500).json({ message: "Failed to update resource library item" });
    }
  });

  app.delete('/api/resource-library/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const itemId = parseInt(id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      // Check if item exists and verify ownership
      const existingItem = await storage.getResourceLibraryItem(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (existingItem.userId !== userId) {
        return res.status(403).json({ message: "Access denied: You can only delete your own items" });
      }
      
      await storage.deleteResourceLibraryItem(itemId);
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
        companyName: req.body.companyName, // frontend sends 'companyName'
        trackingLink: req.body.trackingLink, // frontend sends 'trackingLink'
        affiliateCode: req.body.affiliateCode, // frontend sends 'affiliateCode'
        discountCode: req.body.discountCode,
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
        companyName: req.body.companyName, // frontend sends 'companyName'
        trackingLink: req.body.trackingLink, // frontend sends 'trackingLink'
        affiliateCode: req.body.affiliateCode, // frontend sends 'affiliateCode'
        discountCode: req.body.discountCode,
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

  // ===========================================
  // PERSISTENT DATA API ROUTES - DATABASE STORAGE
  // ===========================================

  // Content Creation System - Monthly Content Calendar
  app.get('/api/persistent/monthly-content-calendar/:year/:month', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const calendar = await storage.getMonthlyContentCalendar(userId, year, month);
      res.json(calendar || null);
    } catch (error) {
      console.error('Error fetching monthly content calendar:', error);
      res.status(500).json({ message: 'Failed to fetch calendar data' });
    }
  });

  app.put('/api/persistent/monthly-content-calendar', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { year, month, calendarData, colorTags } = req.body;
      
      console.log('=== CALENDAR SAVE START ===');
      console.log('Received data:', {
        userId,
        year,
        month,
        calendarDataLength: calendarData?.length,
        colorTagsLength: colorTags?.length,
        calendarDataFirst: calendarData?.[0],
        colorTagsFirst: colorTags?.[0]
      });
      
      // Ensure year and month are numbers
      const validYear = year && typeof year === 'number' ? year : new Date().getFullYear();
      const validMonth = month && typeof month === 'number' ? month : new Date().getMonth() + 1;
      
      // Ensure data is properly serialized
      const serializedCalendarData = JSON.parse(JSON.stringify(calendarData || []));
      const serializedColorTags = JSON.parse(JSON.stringify(colorTags || []));
      
      console.log('Serialized data for DB:', {
        serializedCalendarDataLength: serializedCalendarData.length,
        serializedColorTagsLength: serializedColorTags.length,
        serializedCalendarData,
        serializedColorTags
      });
      
      const calendar = await storage.upsertMonthlyContentCalendar({
        userId,
        year: validYear,
        month: validMonth,
        calendarData: serializedCalendarData,
        colorTags: serializedColorTags
      });
      
      console.log('=== CALENDAR SAVE RESULT ===');
      console.log('Saved calendar:', calendar);
      console.log('=== CALENDAR SAVE END ===');
      res.json(calendar);
    } catch (error) {
      console.error('Error saving monthly content calendar:', error);
      res.status(500).json({ message: 'Failed to save calendar data' });
    }
  });

  // Content Creation System - Content Batching Planner
  app.get('/api/persistent/content-batching-planner', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planner = await storage.getContentBatchingPlanner(userId);
      res.json(planner || null);
    } catch (error) {
      console.error('Error fetching content batching planner:', error);
      res.status(500).json({ message: 'Failed to fetch planner data' });
    }
  });

  app.put('/api/persistent/content-batching-planner', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { posts, customPillars, customPostTypes } = req.body;
      const planner = await storage.upsertContentBatchingPlanner({
        userId,
        posts,
        customPillars,
        customPostTypes
      });
      res.json(planner);
    } catch (error) {
      console.error('Error saving content batching planner:', error);
      res.status(500).json({ message: 'Failed to save planner data' });
    }
  });

  // Content Creation System - Content Status Tracker
  app.get('/api/persistent/content-status-tracker', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tracker = await storage.getContentStatusTracker(userId);
      res.json(tracker || null);
    } catch (error) {
      console.error('Error fetching content status tracker:', error);
      res.status(500).json({ message: 'Failed to fetch tracker data' });
    }
  });

  app.put('/api/persistent/content-status-tracker', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contentItems, customTypes, customPlatforms, customStatuses } = req.body;
      const tracker = await storage.upsertContentStatusTracker({
        userId,
        contentItems,
        customTypes,
        customPlatforms,
        customStatuses
      });
      res.json(tracker);
    } catch (error) {
      console.error('Error saving content status tracker:', error);
      res.status(500).json({ message: 'Failed to save tracker data' });
    }
  });

  // Product Launch System - Seasonality Timeline
  app.get('/api/persistent/seasonality-timeline/:year', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const timeline = await storage.getSeasonalityTimeline(userId, year);
      res.json(timeline || null);
    } catch (error) {
      console.error('Error fetching seasonality timeline:', error);
      res.status(500).json({ message: 'Failed to fetch timeline data' });
    }
  });

  app.put('/api/persistent/seasonality-timeline', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { year, events, eventTypes } = req.body;
      const timeline = await storage.upsertSeasonalityTimeline({
        userId,
        year,
        events,
        eventTypes
      });
      res.json(timeline);
    } catch (error) {
      console.error('Error saving seasonality timeline:', error);
      res.status(500).json({ message: 'Failed to save timeline data' });
    }
  });

  // Product Launch System - Quarter Detail Plans
  app.get('/api/persistent/quarter-detail/:year/:quarter', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const quarter = parseInt(req.params.quarter);
      const plan = await storage.getQuarterDetailPlan(userId, year, quarter);
      res.json(plan || null);
    } catch (error) {
      console.error('Error fetching quarter detail plan:', error);
      res.status(500).json({ message: 'Failed to fetch quarter plan data' });
    }
  });

  app.put('/api/persistent/quarter-detail', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { year, quarter, quarterData } = req.body;
      const plan = await storage.upsertQuarterDetailPlan({
        userId,
        year,
        quarter,
        quarterData
      });
      res.json(plan);
    } catch (error) {
      console.error('Error saving quarter detail plan:', error);
      res.status(500).json({ message: 'Failed to save quarter plan data' });
    }
  });

  // Product Launch System - Profit Calculator
  app.get('/api/persistent/profit-calculator', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const calculator = await storage.getProfitCalculator(userId);
      res.json(calculator || null);
    } catch (error) {
      console.error('Error fetching profit calculator:', error);
      res.status(500).json({ message: 'Failed to fetch calculator data' });
    }
  });

  app.put('/api/persistent/profit-calculator', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { savedCalculations, currency, currentCalculation } = req.body;
      const calculator = await storage.upsertProfitCalculator({
        userId,
        savedCalculations,
        currency,
        currentCalculation
      });
      res.json(calculator);
    } catch (error) {
      console.error('Error saving profit calculator:', error);
      res.status(500).json({ message: 'Failed to save calculator data' });
    }
  });

  // Product Launch System - Pre-launch Timeline Planner
  app.get('/api/persistent/prelaunch-timeline-planner', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planner = await storage.getPrelaunchTimelinePlanner(userId);
      res.json(planner || null);
    } catch (error) {
      console.error('Error fetching prelaunch timeline planner:', error);
      res.status(500).json({ message: 'Failed to fetch planner data' });
    }
  });

  app.put('/api/persistent/prelaunch-timeline-planner', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { timelineLength, weeklyContent, weekNotes } = req.body;
      const planner = await storage.upsertPrelaunchTimelinePlanner({
        userId,
        timelineLength,
        weeklyContent,
        weekNotes
      });
      res.json(planner);
    } catch (error) {
      console.error('Error saving prelaunch timeline planner:', error);
      res.status(500).json({ message: 'Failed to save planner data' });
    }
  });

  // Product Launch System - Launch Growth Plans
  app.get('/api/persistent/launch-growth-plans', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const plans = await storage.getLaunchGrowthPlans(userId);
      res.json(plans || null);
    } catch (error) {
      console.error('Error fetching launch growth plans:', error);
      res.status(500).json({ message: 'Failed to fetch growth plans data' });
    }
  });

  app.put('/api/persistent/launch-growth-plans', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { growthPlans } = req.body;
      const plans = await storage.upsertLaunchGrowthPlans({
        userId,
        growthPlans
      });
      res.json(plans);
    } catch (error) {
      console.error('Error saving launch growth plans:', error);
      res.status(500).json({ message: 'Failed to save growth plans data' });
    }
  });

  // Financial Management System - Money Map
  app.get('/api/persistent/money-map', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const moneyMap = await storage.getMoneyMap(userId);
      res.json(moneyMap || null);
    } catch (error) {
      console.error('Error fetching money map:', error);
      res.status(500).json({ message: 'Failed to fetch money map data' });
    }
  });

  app.put('/api/persistent/money-map', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currency, period, goalsData, incomeExpensesData, savingsData, monthlySnapshots } = req.body;
      const moneyMap = await storage.upsertMoneyMap({
        userId,
        currency,
        period,
        goalsData,
        incomeExpensesData,
        savingsData,
        monthlySnapshots
      });
      res.json(moneyMap);
    } catch (error) {
      console.error('Error saving money map:', error);
      res.status(500).json({ message: 'Failed to save money map data' });
    }
  });

  // Streamline Your Workflow System - SOP Builder
  app.get('/api/persistent/sop-builder', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const builder = await storage.getSopBuilder(userId);
      res.json(builder || null);
    } catch (error) {
      console.error('Error fetching SOP builder:', error);
      res.status(500).json({ message: 'Failed to fetch SOP builder data' });
    }
  });

  app.put('/api/persistent/sop-builder', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sops } = req.body;
      const builder = await storage.upsertSopBuilder({
        userId,
        sops
      });
      res.json(builder);
    } catch (error) {
      console.error('Error saving SOP builder:', error);
      res.status(500).json({ message: 'Failed to save SOP builder data' });
    }
  });

  // Streamline Your Workflow System - Automation Toolkit
  app.get('/api/persistent/automation-toolkit', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const toolkit = await storage.getAutomationToolkit(userId);
      res.json(toolkit || null);
    } catch (error) {
      console.error('Error fetching automation toolkit:', error);
      res.status(500).json({ message: 'Failed to fetch automation toolkit data' });
    }
  });

  app.put('/api/persistent/automation-toolkit', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { promptLibrary, flowBuilder, instagramCopies, prewrittenReplies, oneClickFlows } = req.body;
      const toolkit = await storage.upsertAutomationToolkit({
        userId,
        promptLibrary,
        flowBuilder,
        instagramCopies,
        prewrittenReplies,
        oneClickFlows
      });
      res.json(toolkit);
    } catch (error) {
      console.error('Error saving automation toolkit:', error);
      res.status(500).json({ message: 'Failed to save automation toolkit data' });
    }
  });

  // Automation Prompts CRUD API
  app.get('/api/automation/prompts', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prompts = await storage.getAutomationPrompts(userId);
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching automation prompts:', error);
      res.status(500).json({ message: 'Failed to fetch automation prompts' });
    }
  });

  app.post('/api/automation/prompts', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompts } = req.body;
      
      if (!Array.isArray(prompts)) {
        return res.status(400).json({ message: 'Prompts must be an array' });
      }
      
      const result = await storage.bulkUpsertAutomationPrompts(userId, prompts);
      res.json(result);
    } catch (error) {
      console.error('Error bulk upserting automation prompts:', error);
      res.status(500).json({ message: 'Failed to save automation prompts' });
    }
  });

  app.post('/api/automation/prompt', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const promptData = { ...req.body, userId };
      
      const prompt = await storage.createAutomationPrompt(promptData);
      res.json(prompt);
    } catch (error) {
      console.error('Error creating automation prompt:', error);
      res.status(500).json({ message: 'Failed to create automation prompt' });
    }
  });

  app.patch('/api/automation/prompt/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const promptId = req.params.id;
      
      // Check ownership
      const existingPrompt = await storage.getAutomationPrompt(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      if (existingPrompt.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to modify this prompt' });
      }
      
      const prompt = await storage.updateAutomationPrompt(promptId, req.body);
      res.json(prompt);
    } catch (error) {
      console.error('Error updating automation prompt:', error);
      res.status(500).json({ message: 'Failed to update automation prompt' });
    }
  });

  app.delete('/api/automation/prompt/:id', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const promptId = req.params.id;
      
      // Check ownership
      const existingPrompt = await storage.getAutomationPrompt(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      if (existingPrompt.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this prompt' });
      }
      
      await storage.deleteAutomationPrompt(promptId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting automation prompt:', error);
      res.status(500).json({ message: 'Failed to delete automation prompt' });
    }
  });

  // Cheat Sheet Document Routes (Single document per user with optimistic versioning)
  app.get('/api/automation/cheatsheet', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Try to get existing document
      let doc = await storage.getCheatSheetDoc(userId);
      
      // If no document exists, seed one
      if (!doc) {
        doc = await storage.seedCheatSheetDoc(userId);
      }
      
      // Transform to frontend-expected format
      const data = doc.data as any;
      const transformed = {
        id: doc.userId,
        version: doc.version,
        rows: data.rows || [],
        updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString()
      };
      
      res.json(transformed);
    } catch (error) {
      console.error('Error fetching cheat sheet document:', error);
      res.status(500).json({ message: 'Failed to fetch cheat sheet document' });
    }
  });

  app.put('/api/automation/cheatsheet', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const { version, rows } = cheatSheetDocPutBodySchema.parse(req.body);
      
      // Attempt optimistic update
      const result = await storage.updateCheatSheetDocOptimistic(userId, version, rows);
      
      if (result.success && result.doc) {
        // Transform to frontend-expected format
        const data = result.doc.data as any;
        const transformed = {
          id: result.doc.userId,
          version: result.doc.version,
          rows: data.rows || [],
          updatedAt: result.doc.updatedAt?.toISOString() || new Date().toISOString()
        };
        res.json(transformed);
      } else {
        // Version conflict - return 409 with current state
        res.status(409).json({
          message: 'Version conflict - document was updated by another session',
          conflict: result.conflict
        });
      }
    } catch (error) {
      console.error('Error updating cheat sheet document:', error);
      res.status(500).json({ message: 'Failed to update cheat sheet document' });
    }
  });

  // Focus Timer System - Session Logging
  app.post('/api/persistent/focus-session', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { taskName, durationMinutes, completedAt } = req.body;
      const sessionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const session = await storage.logFocusSession({
        userId,
        task: taskName,
        duration: durationMinutes,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        sessionDate
      });
      res.json(session);
    } catch (error) {
      console.error('Error logging focus session:', error);
      res.status(500).json({ message: 'Failed to log focus session' });
    }
  });

  app.get('/api/persistent/focus-sessions', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const sessions = await storage.getFocusSessionLogs(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching focus sessions:', error);
      res.status(500).json({ message: 'Failed to fetch focus sessions' });
    }
  });

  // Calendar V2 - Complete rebuild
  app.get('/api/calendar-v2/:year/:month', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      console.log(`Calendar V2 GET - User: ${userId}, Year: ${year}, Month: ${month}`);
      
      const calendar = await storage.getCalendarV2(userId, year, month);
      
      console.log('Calendar V2 GET - Database result:', {
        found: !!calendar,
        id: calendar?.id,
        colorKeysCount: Array.isArray(calendar?.colorKeys) ? calendar.colorKeys.length : 0,
        daysCount: Array.isArray(calendar?.days) ? calendar.days.length : 0
      });
      
      res.json(calendar || null);
    } catch (error) {
      console.error('Error fetching calendar v2:', error);
      res.status(500).json({ message: 'Failed to fetch calendar data' });
    }
  });

  app.put('/api/calendar-v2', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { year, month, colorKeys, days } = req.body;
      
      console.log('Calendar V2 PUT - Received data:', {
        userId,
        year,
        month,
        colorKeysCount: Array.isArray(colorKeys) ? colorKeys.length : 0,
        daysCount: Array.isArray(days) ? days.length : 0,
        colorKeysType: typeof colorKeys,
        daysType: typeof days
      });
      
      const calendar = await storage.upsertCalendarV2({
        userId,
        year,
        month,
        colorKeys: colorKeys || [],
        days: days || []
      });
      
      console.log('Calendar V2 PUT - Save successful:', {
        id: calendar.id,
        savedColorKeys: calendar.colorKeys,
        savedDays: calendar.days
      });
      
      res.json(calendar);
    } catch (error) {
      console.error('Error saving calendar v2:', error);
      res.status(500).json({ message: 'Failed to save calendar data' });
    }
  });

  // Calendar V3 - Final rebuild with comprehensive logging
  app.get('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      console.log(`Calendar V3 GET - User: ${userId}, Year: ${year}, Month: ${month}`);
      
      // Get the month-specific calendar (for days data)
      const calendar = await storage.getCalendarV3(userId, year, month);
      
      // Get global color keys
      let globalKeys = await storage.getGlobalColorKeys(userId);
      
      // Backward compatibility: If no global keys exist, seed from existing data or defaults
      if (!globalKeys) {
        console.log('Calendar V3 GET - No global keys found, seeding...');
        
        let seedColorKeys = [];
        
        // Try to seed from current month's data if it exists
        if (calendar && calendar.colorKeys && calendar.colorKeys.length > 0) {
          seedColorKeys = calendar.colorKeys.map((key: any) => ({
            id: key.id,
            label: key.label,
            color: key.colour || key.color // Normalize to 'color'
          }));
          console.log('Calendar V3 GET - Seeding from current month data');
        } else {
          // Use default color keys
          seedColorKeys = [
            { id: '1', label: 'Email', color: '#3B82F6' },
            { id: '2', label: 'Reel', color: '#10B981' },
            { id: '3', label: 'Carousel', color: '#8B5CF6' },
            { id: '4', label: 'Post', color: '#F59E0B' },
            { id: '5', label: 'Story', color: '#EF4444' },
            { id: '6', label: 'YouTube Video', color: '#14B8A6' },
            { id: '7', label: 'Long Form', color: '#EC4899' },
            { id: '8', label: 'TikTok', color: '#6366F1' },
            { id: '9', label: 'Shorts', color: '#F97316' }
          ];
          console.log('Calendar V3 GET - Seeding with default keys');
        }
        
        // Create global color keys
        globalKeys = await storage.upsertGlobalColorKeys({
          userId,
          colorKeys: seedColorKeys
        });
      }
      
      // If calendar doesn't exist for this month, create it with empty days
      if (!calendar) {
        console.log('Calendar V3 GET - Creating new calendar for month');
        await storage.upsertCalendarV3({
          userId,
          year,
          month,
          colorKeys: [], // Empty - we use global keys now
          days: []
        });
      }
      
      // Normalize colorKeys to always use 'color' field (not 'colour')
      const normalizedColorKeys = (globalKeys.colorKeys || []).map((key: any) => ({
        id: key.id,
        label: key.label,
        color: key.colour || key.color
      }));
      
      const response = {
        userId,
        year,
        month,
        colorKeys: normalizedColorKeys,
        days: calendar?.days || []
      };
      
      console.log('Calendar V3 GET - Sending response:', {
        colorKeysCount: response.colorKeys.length,
        daysCount: response.days.length,
        source: 'global'
      });
      
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(response);
    } catch (error) {
      console.error('Error fetching calendar v3:', error);
      res.status(500).json({ message: 'Failed to fetch calendar data' });
    }
  });

  // Calendar V3 - Migration endpoint to update color key labels
  app.post('/api/calendar-v3/migrate-labels', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { year, month } = req.body;
      
      const calendar = await storage.getCalendarV3(userId, year, month);
      
      if (calendar && calendar.colorKeys) {
        // Map old labels to new labels
        const labelMap = {
          'Email Marketing': 'Email',
          'Content Creation': 'Reel', 
          'Filming': 'Carousel',
          'Editing': 'Post',
          'Planning': 'Story',
          'Product Development': 'YouTube Video',
          'Creative Time': 'Long Form'
        };
        
        const updatedColorKeys = calendar.colorKeys.map((key: any) => ({
          ...key,
          label: labelMap[key.label as keyof typeof labelMap] || key.label
        }));
        
        // Add missing labels if we have fewer than 9 keys
        const newLabels = ['Email', 'Reel', 'Carousel', 'Post', 'Story', 'YouTube Video', 'Long Form', 'TikTok', 'Shorts'];
        const existingLabels = updatedColorKeys.map((k: any) => k.label);
        const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#F97316'];
        
        let nextId = Math.max(...updatedColorKeys.map((k: any) => parseInt(k.id.replace(/\D/g, '')) || 0)) + 1;
        
        newLabels.forEach((label, index) => {
          if (!existingLabels.includes(label)) {
            updatedColorKeys.push({
              id: `tag-${nextId++}`,
              label,
              color: colors[index] || '#3B82F6'
            });
          }
        });
        
        await storage.upsertCalendarV3({
          userId,
          year,
          month,
          colorKeys: updatedColorKeys,
          days: calendar.days || []
        });
        
        res.json({ success: true, updatedKeys: updatedColorKeys.length });
      } else {
        res.json({ success: false, message: 'No calendar found' });
      }
    } catch (error) {
      console.error('Error migrating calendar labels:', error);
      res.status(500).json({ message: 'Failed to migrate labels' });
    }
  });

  app.put('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const { colorKeys, days } = req.body;
      
      console.log('Calendar V3 PUT - Received data:', {
        userId,
        year,
        month,
        colorKeysCount: Array.isArray(colorKeys) ? colorKeys.length : 0,
        daysCount: Array.isArray(days) ? days.length : 0
      });
      
      // Normalize colorKeys to always use 'color' field (not 'colour')
      const normalizedColorKeys = (colorKeys || []).map((key: any) => ({
        id: key.id,
        label: key.label,
        color: key.colour || key.color
      }));
      
      // Save color keys GLOBALLY (not month-specific)
      const globalKeys = await storage.upsertGlobalColorKeys({
        userId,
        colorKeys: normalizedColorKeys
      });
      
      // Save days to month-specific calendar (colorKeys field empty since we use global now)
      const calendar = await storage.upsertCalendarV3({
        userId,
        year,
        month,
        colorKeys: [], // Empty - using global keys
        days: days || []
      });
      
      // Normalize response colorKeys to always use 'color' field
      const responseColorKeys = (globalKeys.colorKeys || []).map((key: any) => ({
        id: key.id,
        label: key.label,
        color: key.colour || key.color
      }));
      
      const response = {
        userId: calendar.userId,
        year: calendar.year,
        month: calendar.month,
        colorKeys: responseColorKeys,
        days: calendar.days || []
      };
      
      console.log('Calendar V3 PUT - Sending response:', {
        colorKeysCount: response.colorKeys.length,
        daysCount: response.days.length,
        colorKeysSavedAs: 'global'
      });
      
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(response);
    } catch (error) {
      console.error('Error saving calendar v3:', error);
      res.status(500).json({ message: 'Failed to save calendar data' });
    }
  });

  // Default Time Blocking Color Keys
  const DEFAULT_TIME_BLOCKING_COLOR_KEYS = [
    { id: 'tb-1', label: 'Deep Work', color: '#3B82F6' },
    { id: 'tb-2', label: 'Filming', color: '#10B981' },
    { id: 'tb-3', label: 'Editing', color: '#8B5CF6' },
    { id: 'tb-4', label: 'Email Marketing', color: '#F59E0B' },
    { id: 'tb-5', label: 'Social Scheduling', color: '#EF4444' },
    { id: 'tb-6', label: 'Listing Work', color: '#14B8A6' },
    { id: 'tb-7', label: 'Admin/Ops', color: '#EC4899' },
    { id: 'tb-8', label: 'Finance', color: '#6366F1' },
    { id: 'tb-9', label: 'Product Dev', color: '#F97316' },
    { id: 'tb-10', label: 'Packing/Shipping', color: '#8B5CF6' },
    { id: 'tb-11', label: 'Creation Time', color: '#A855F7' },
  ];

  // Time Blocking Color Keys API Routes
  app.get('/api/time-blocking-color-keys', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log(`Time Blocking Color Keys GET - User: ${userId}`);
      
      // Get global color keys for this user
      let colorKeys = await storage.getTimeBlockingColorKeys(userId);
      
      // If no keys exist, seed defaults
      if (!colorKeys) {
        console.log('Time Blocking Color Keys - No keys found, seeding defaults');
        
        colorKeys = await storage.upsertTimeBlockingColorKeys({
          userId,
          colorKeys: DEFAULT_TIME_BLOCKING_COLOR_KEYS,
        });
      }
      
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        colorKeys: colorKeys.colorKeys || [],
      });
    } catch (error) {
      console.error('Error fetching time blocking color keys:', error);
      res.status(500).json({ message: 'Failed to fetch color keys' });
    }
  });

  app.put('/api/time-blocking-color-keys', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { colorKeys } = req.body;
      
      console.log(`Time Blocking Color Keys PUT - User: ${userId}, Keys: ${colorKeys?.length || 0}`);
      
      const updated = await storage.upsertTimeBlockingColorKeys({
        userId,
        colorKeys: colorKeys || [],
      });
      
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        colorKeys: updated.colorKeys || [],
      });
    } catch (error) {
      console.error('Error saving time blocking color keys:', error);
      res.status(500).json({ message: 'Failed to save color keys' });
    }
  });

  // Time Blocking Events API Routes
  app.get('/api/time-blocking-events', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const events = await storage.getTimeBlockingEvents(userId, start, end);
      
      res.setHeader('Cache-Control', 'no-store');
      res.json(events);
    } catch (error) {
      console.error('Error fetching time blocking events:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  app.get('/api/time-blocking-events/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getTimeBlockingEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // Verify ownership
      if (event.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.setHeader('Cache-Control', 'no-store');
      res.json(event);
    } catch (error) {
      console.error('Error fetching time blocking event:', error);
      res.status(500).json({ message: 'Failed to fetch event' });
    }
  });

  app.post('/api/time-blocking-events', jwtAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const eventData = { ...req.body, userId };
      
      const event = await storage.createTimeBlockingEvent(eventData);
      
      console.log(`Created time blocking event ${event.id} for user ${userId}`);
      res.setHeader('Cache-Control', 'no-store');
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating time blocking event:', error);
      res.status(500).json({ message: 'Failed to create event' });
    }
  });

  app.patch('/api/time-blocking-events/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership first
      const existingEvent = await storage.getTimeBlockingEvent(id);
      if (!existingEvent || existingEvent.userId !== userId) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      const updatedEvent = await storage.updateTimeBlockingEvent(id, req.body);
      
      console.log(`Updated time blocking event ${id} for user ${userId}`);
      res.setHeader('Cache-Control', 'no-store');
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating time blocking event:', error);
      res.status(500).json({ message: 'Failed to update event' });
    }
  });

  app.delete('/api/time-blocking-events/:id', jwtAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership first
      const existingEvent = await storage.getTimeBlockingEvent(id);
      if (!existingEvent || existingEvent.userId !== userId) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      await storage.deleteTimeBlockingEvent(id, userId);
      
      console.log(`Deleted time blocking event ${id} for user ${userId}`);
      res.setHeader('Cache-Control', 'no-store');
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting time blocking event:', error);
      res.status(500).json({ message: 'Failed to delete event' });
    }
  });

  // Systeme.io webhook endpoint for course purchases
  app.post('/api/systeme-webhook', async (req, res) => {
    console.log('=== WEBHOOK START ===');
    console.log('Systeme.io webhook received:', JSON.stringify(req.body, null, 2));
    
    try {
      // Extract email from webhook data with comprehensive search
      // Systeme.io can send email in various formats
      let email = null;
      
      // Try different possible email field locations
      if (req.body?.contact?.email) {
        email = req.body.contact.email;
      } else if (req.body?.email) {
        email = req.body.email;
      } else if (req.body?.customer?.email) {
        email = req.body.customer.email;
      } else if (req.body?.user?.email) {
        email = req.body.user.email;
      } else {
        // Search for any email field in the entire object
        const searchForEmail = (obj: any): string | null => {
          for (const key in obj) {
            if (key.toLowerCase().includes('email') && typeof obj[key] === 'string' && obj[key].includes('@')) {
              return obj[key];
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              const found: string | null = searchForEmail(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };
        email = searchForEmail(req.body);
      }
      
      console.log('Extracted email:', email);
      console.log('Email extraction method: comprehensive search');
      
      if (!email) {
        console.error('No email found in webhook data');
        const errorResponse = { error: 'No email found in webhook data' };
        console.log('Sending error response:', errorResponse);
        res.status(400).json(errorResponse);
        return;
      }
      
      // Add email to whitelist
      console.log('Adding email to whitelist...');
      const whitelistEntry = await storage.addEmailToWhitelist(email, 'systeme_webhook');
      console.log('Whitelist entry created:', whitelistEntry);
      
      console.log(`Email ${email} added to whitelist successfully`);
      
      // Respond with 200 OK as required by Systeme.io
      const response = { 
        success: true, 
        message: 'Email added to whitelist',
        email: email 
      };
      
      console.log('Sending response:', response);
      res.status(200).json(response);
      console.log('=== WEBHOOK END ===');
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      const errorResponse = { error: 'Internal server error' };
      console.log('Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  });

  // Serve object storage images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      res.status(404).json({ error: "Object not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
