import { Router } from "express";
import { db, inventoryTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

function formatItem(item: typeof inventoryTable.$inferSelect) {
  return {
    ...item,
    quantity: Number(item.quantity),
    minQuantity: Number(item.minQuantity),
    unitCost: item.unitCost !== null ? Number(item.unitCost) : null,
    isLowStock: Number(item.quantity) <= Number(item.minQuantity),
  };
}

router.get("/inventory", requireAuth, async (req: AuthRequest, res) => {
  // Dentists cannot access inventory
  if (req.user?.role === "dentist") {
    res.status(403).json({ error: "Forbidden", message: "Dentists cannot access inventory" });
    return;
  }
  const { search, lowStock } = req.query as Record<string, string>;
  let query = db.select().from(inventoryTable);
  if (search) query = query.where(ilike(inventoryTable.name, `%${search}%`)) as typeof query;
  if (lowStock === "true") query = query.where(sql`${inventoryTable.quantity}::numeric <= ${inventoryTable.minQuantity}::numeric`) as typeof query;
  const items = await query.orderBy(inventoryTable.name);
  res.json(items.map(formatItem));
});

router.post("/inventory", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role === "dentist") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, unit, quantity = 0, minQuantity = 0, ...rest } = req.body;
  if (!name || !unit) { res.status(400).json({ error: "name and unit are required" }); return; }
  const [item] = await db.insert(inventoryTable).values({ name, unit, quantity: String(quantity), minQuantity: String(minQuantity), ...rest }).returning();
  res.status(201).json(formatItem(item));
});

router.get("/inventory/:id", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role === "dentist") { res.status(403).json({ error: "Forbidden" }); return; }
  const [item] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, Number(req.params.id)));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatItem(item));
});

router.put("/inventory/:id", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role === "dentist") { res.status(403).json({ error: "Forbidden" }); return; }
  const [item] = await db.update(inventoryTable).set({ ...req.body, updatedAt: new Date() }).where(eq(inventoryTable.id, Number(req.params.id))).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatItem(item));
});

router.delete("/inventory/:id", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role === "dentist") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(inventoryTable).where(eq(inventoryTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.post("/inventory/:id/adjust", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role === "dentist") { res.status(403).json({ error: "Forbidden" }); return; }
  const { type, quantity } = req.body;
  if (!type || !quantity) { res.status(400).json({ error: "type and quantity are required" }); return; }
  const [item] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, Number(req.params.id)));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  const current = Number(item.quantity);
  const delta = type === "in" ? Number(quantity) : -Number(quantity);
  const newQty = Math.max(0, current + delta);
  const [updated] = await db.update(inventoryTable).set({ quantity: String(newQty), updatedAt: new Date() }).where(eq(inventoryTable.id, Number(req.params.id))).returning();
  res.json(formatItem(updated));
});

export default router;
