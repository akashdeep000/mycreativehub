// Shared TypeScript interfaces for both calendars
import { CalendarEvent, CalendarColorKey, CalendarMonthGoal } from '@shared/schema';

export type ColorKey = CalendarColorKey;

// Frontend uses the same types as backend - Date objects throughout
export type CalendarEntry = CalendarEvent;

export interface DayData {
  date: number | string;
  entries: CalendarEntry[];
  dayNotes?: string;
  mediaUrls?: string[];
}

export interface CalendarView {
  type: 'monthly' | 'weekly' | 'daily';
  date: Date;
}

export type MonthGoals = CalendarMonthGoal;

// Helper to sort entries by time
export function sortEntriesByTime(entries: CalendarEntry[]): CalendarEntry[] {
  return [...entries].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}

// Helper to get display title from entry
// Falls back to color key label if title is empty
export function getEntryDisplayTitle(entry: CalendarEntry, colorKeys: ColorKey[]): string {
  if (entry.title && entry.title.trim()) {
    return entry.title;
  }

  // Fallback to color key label
  const colorKey = colorKeys.find(k => k.id === entry.colorKeyId);
  return colorKey?.label || 'Untitled';
}

// ============================================================================
// CENTRALIZED EVENT TIME DEFAULTS
// All event time defaults can be configured from this single location
// ============================================================================

// All-day event time boundaries
export const DEFAULT_ALL_DAY_START_HOUR = 0;
export const DEFAULT_ALL_DAY_START_MINUTE = 0;
export const DEFAULT_ALL_DAY_END_HOUR = 23;
export const DEFAULT_ALL_DAY_END_MINUTE = 59;
export const DEFAULT_ALL_DAY_END_SECOND = 59;
export const DEFAULT_ALL_DAY_END_MILLISECOND = 999;

// Toggle-off all-day defaults (when user turns off all-day mode)
export const DEFAULT_TOGGLE_OFF_START_HOUR = 9;
export const DEFAULT_TOGGLE_OFF_START_MINUTE = 0;
export const DEFAULT_TOGGLE_OFF_END_HOUR = 10;
export const DEFAULT_TOGGLE_OFF_END_MINUTE = 0;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get start and end Date objects for an all-day event
 * All-day events span from day start (0:00:00) to day end (23:59:59.999)
 */
export function getAllDayEventTimes(date: Date): { startTime: Date; endTime: Date } {
  const startTime = new Date(date);
  startTime.setHours(
    DEFAULT_ALL_DAY_START_HOUR,
    DEFAULT_ALL_DAY_START_MINUTE,
    0,
    0
  );

  const endTime = new Date(date);
  endTime.setHours(
    DEFAULT_ALL_DAY_END_HOUR,
    DEFAULT_ALL_DAY_END_MINUTE,
    DEFAULT_ALL_DAY_END_SECOND,
    DEFAULT_ALL_DAY_END_MILLISECOND
  );

  return { startTime, endTime };
}

/**
 * Get default times when toggling off all-day mode
 * Always defaults to 9:00 AM - 10:00 AM regardless of current time
 */
export function getToggleOffDefaultTimes(): { defaultStart: string; defaultEnd: string } {
  const defaultStart = `${DEFAULT_TOGGLE_OFF_START_HOUR.toString().padStart(2, '0')}:${DEFAULT_TOGGLE_OFF_START_MINUTE.toString().padStart(2, '0')}`;
  const defaultEnd = `${DEFAULT_TOGGLE_OFF_END_HOUR.toString().padStart(2, '0')}:${DEFAULT_TOGGLE_OFF_END_MINUTE.toString().padStart(2, '0')}`;

  return { defaultStart, defaultEnd };
}

/**
 * Get smart default times for new event creation
 * - For today: defaults to next hour (e.g., if it's 10:30 AM, defaults to 11:00 AM - 12:00 PM)
 * - For future dates: defaults to 9:00 AM - 10:00 AM
 */
export function getSmartDefaultTimes(date?: Date) {
  let defaultStart = '09:00';
  let defaultEnd = '10:00';

  if (date) {
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      // If today, default to next hour
      const nextHour = now.getHours() + 1;
      if (nextHour < 24) {
        defaultStart = `${nextHour.toString().padStart(2, '0')}:00`;
        const endHour = (nextHour + 1) % 24;
        defaultEnd = `${endHour.toString().padStart(2, '0')}:00`;
      }
    }
  }
  return { defaultStart, defaultEnd };
}
