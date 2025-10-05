
import { db } from "../server/db";
import { toolkitModules } from "@shared/schema";
import { eq, like } from "drizzle-orm";

async function deleteFinancialModule() {
  try {
    // First, find the Financial Management module
    const modules = await db
      .select()
      .from(toolkitModules)
      .where(like(toolkitModules.name, '%Financial%'));

    if (modules.length === 0) {
      console.log("No Financial Management module found");
      return;
    }

    console.log("Found module(s):", modules);

    // Delete the module(s)
    for (const module of modules) {
      await db
        .delete(toolkitModules)
        .where(eq(toolkitModules.id, module.id));
      
      console.log(`Deleted module: ${module.name} (ID: ${module.id})`);
    }

    console.log("Financial Management module deletion complete");
  } catch (error) {
    console.error("Error deleting Financial Management module:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

deleteFinancialModule();
