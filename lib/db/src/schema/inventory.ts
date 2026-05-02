import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  minQuantity: numeric("min_quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InventoryItem = typeof inventoryTable.$inferSelect;
