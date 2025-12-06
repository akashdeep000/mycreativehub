
import { db } from "../server/db";
import {
    monthlyContentCalendar,
    calendarEvents,
    calendarColorKeys,
    users
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function migrate() {
    console.log("Starting calendar data migration...");

    // 1. Get all users to migrate
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to check.`);

    for (const user of allUsers) {
        console.log(`Processing user: ${user.email} (${user.id})`);

        // 2. Get monthly content calendar data for this user
        const calendars = await db
            .select()
            .from(monthlyContentCalendar)
            .where(eq(monthlyContentCalendar.userId, user.id));

        if (calendars.length === 0) {
            console.log(`  No calendar data found.`);
            continue;
        }

        console.log(`  Found ${calendars.length} calendar months.`);

        // Map to store created color keys to avoid duplicates
        // Key: label, Value: new UUID
        const colorKeyMap = new Map<string, string>();

        // 3. Process Color Keys first (from all months to get a complete set)
        for (const cal of calendars) {
            const colorTags = cal.colorTags as any[];
            if (!colorTags) continue;

            for (const tag of colorTags) {
                if (!colorKeyMap.has(tag.label)) {
                    // Check if key already exists in DB (idempotency)
                    const existingKey = await db.query.calendarColorKeys.findFirst({
                        where: and(
                            eq(calendarColorKeys.userId, user.id),
                            eq(calendarColorKeys.label, tag.label),
                            eq(calendarColorKeys.type, 'content')
                        )
                    });

                    if (existingKey) {
                        colorKeyMap.set(tag.label, existingKey.id);
                    } else {
                        // Create new key
                        const [newKey] = await db.insert(calendarColorKeys).values({
                            userId: user.id,
                            label: tag.label,
                            color: tag.color || '#3B82F6', // Default blue if missing
                            type: 'content',
                            isDefault: false
                        }).returning();
                        colorKeyMap.set(tag.label, newKey.id);
                        console.log(`    Created color key: ${tag.label}`);
                    }
                }
            }
        }

        // 4. Process Events
        let eventCount = 0;
        for (const cal of calendars) {
            const entries = cal.calendarData as any[];
            if (!entries) continue;

            for (const entry of entries) {
                // Find the color key ID
                // The old entry has 'colorKeyId' which matched the old tag ID.
                // We need to find the label for that old tag ID to map to the new UUID.
                const colorTags = cal.colorTags as any[];
                const oldTag = colorTags.find(t => t.id === entry.colorKeyId);

                let newColorKeyId = null;
                if (oldTag && colorKeyMap.has(oldTag.label)) {
                    newColorKeyId = colorKeyMap.get(oldTag.label);
                }

                // Calculate start/end times
                // Old format: date (day of month), time (HH:MM)
                const year = cal.year;
                const month = cal.month; // 1-12
                const day = entry.date || 1; // Assuming entry has date, or we need to find it from context?
                // Wait, the JSON structure for calendarData is likely an array of days, or flat entries?
                // Let's check the schema or previous code.
                // In monthly-content-calendar-v3.tsx:
                // interface CalendarDay { date: number; entries: CalendarEntry[]; }
                // So calendarData is CalendarDay[]
            }
        }

        // Re-doing the loop because calendarData is structured as days
        for (const cal of calendars) {
            const days = cal.calendarData as any[]; // CalendarDay[]
            if (!days) continue;

            for (const day of days) {
                if (!day.entries) continue;

                for (const entry of day.entries) {
                    // Find the color key ID
                    const colorTags = cal.colorTags as any[];
                    const oldTag = colorTags.find(t => t.id === entry.colorKeyId);

                    let newColorKeyId = null;
                    if (oldTag && colorKeyMap.has(oldTag.label)) {
                        newColorKeyId = colorKeyMap.get(oldTag.label);
                    }

                    // Construct Date objects
                    // Note: Month is 1-indexed in DB, 0-indexed in JS Date
                    const dateStr = `${cal.year}-${String(cal.month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;

                    let startTime = new Date(`${dateStr}T09:00:00Z`); // Default 9 AM
                    let endTime = new Date(`${dateStr}T10:00:00Z`);   // Default 1 hour duration

                    if (entry.time) {
                        const [hours, minutes] = entry.time.split(':').map(Number);
                        if (!isNaN(hours) && !isNaN(minutes)) {
                            startTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
                            // Default end time 1 hour later
                            endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                        }
                    }

                    if (entry.endTime) {
                        const [hours, minutes] = entry.endTime.split(':').map(Number);
                        if (!isNaN(hours) && !isNaN(minutes)) {
                            endTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
                        }
                    }

                    // Insert Event
                    await db.insert(calendarEvents).values({
                        userId: user.id,
                        title: entry.title || (oldTag ? oldTag.label : 'Untitled Event'),
                        description: entry.notes || '',
                        startTime: startTime,
                        endTime: endTime,
                        isAllDay: entry.isAllDay || false,
                        colorKeyId: newColorKeyId,
                        type: 'content',
                        completed: entry.completed || false,
                        completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
                    });
                    eventCount++;
                }
            }
        }
        console.log(`    Migrated ${eventCount} events.`);
    }

    console.log("Migration complete!");
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
