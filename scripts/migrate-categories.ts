
import { db } from "../server/db";
import { resourceCategories, resourceLibrary } from "../shared/schema";
import { eq } from "drizzle-orm";

const CATEGORY_MAPPINGS: Record<string, string[]> = {
    "Email Marketing": [
        "Email Anatomy Breakdown",
        "Email Funnel Flowchart",
        "Email Marketing Roadmap",
        "Lead Magnet Prompt Pack"
    ],
    "Content Creation": [
        "Repurposing Checklist",
        "Content Planner Folder System"
    ],
    "Product Launch": [
        "eRank Cheat Sheet",
        "Pre-Launch Checklist",
        "The Complete Product Prep Checklist",
        "The Product Listing Guide",
        "Best Photography Tutorials",
        "Launch Day Blueprint"
    ],
    "Financial Management": [
        "Profit Goal Planner"
    ],
    "Affiliate Marketing": [
        "The Gear Guide Template"
    ]
};

const DEFAULT_CATEGORIES = [
    ...Object.keys(CATEGORY_MAPPINGS),
    "Other"
];

async function migrate() {
    console.log("Starting migration...");

    // 1. Populate Categories
    console.log("Checking categories...");
    const existingCategories = await db.select().from(resourceCategories);

    if (existingCategories.length === 0) {
        console.log("No categories found. Seeding default categories...");
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            await db.insert(resourceCategories).values({
                name: DEFAULT_CATEGORIES[i],
                displayOrder: i + 1,
            });
        }
        console.log("Categories seeded.");
    } else {
        console.log(`Found ${existingCategories.length} existing categories.`);
    }

    // Reload categories to get IDs
    const allCategories = await db.select().from(resourceCategories);
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
    const otherCategoryId = categoryMap.get("Other");

    // 2. Migrate Resources
    console.log("Migrating resources...");
    const resources = await db.select().from(resourceLibrary);
    let migratedCount = 0;

    for (const resource of resources) {
        if (resource.categoryId) continue; // Already migrated

        let targetCategoryId = otherCategoryId;

        // Try to find a matching category based on title
        for (const [categoryName, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
            const categoryId = categoryMap.get(categoryName);
            if (!categoryId) continue;

            // Check if title contains any of the keywords (or exact match if preferred, but loose match is safer)
            const title = resource.title.toLowerCase();
            const fileName = resource.fileName?.toLowerCase() || "";

            const isMatch = keywords.some(keyword => {
                const k = keyword.toLowerCase();
                return title.includes(k) || fileName.includes(k);
            });

            if (isMatch) {
                targetCategoryId = categoryId;
                console.log(`Matched "${resource.title}" to category "${categoryName}"`);
                break;
            }
        }

        if (targetCategoryId) {
            await db.update(resourceLibrary)
                .set({ categoryId: targetCategoryId })
                .where(eq(resourceLibrary.id, resource.id));
            migratedCount++;
        } else {
            console.warn(`Could not find category ID for resource ${resource.id} ("${resource.title}")`);
        }
    }

    console.log(`Migration complete. Migrated ${migratedCount} resources.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
