import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, hashPassword, AuthRequest } from "../lib/auth";

const router = Router();

const userFields = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
};

router.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await db.select(userFields).from(usersTable);
  res.json(users);
});

router.post("/users", requireAuth, requireRole("admin"), async (req: AuthRequest, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning();
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

router.get("/users/:id", requireAuth, async (req, res) => {
  const [user] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.put("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, role, isActive, password } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = hashPassword(password);
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, Number(req.params.id))).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
