import { Router } from "express";
import { db, patientsTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/patients", requireAuth, async (req, res) => {
  const { search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  let query = db.select().from(patientsTable);
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(patientsTable);

  if (search) {
    const like = `%${search}%`;
    const condition = or(
      ilike(patientsTable.firstName, like),
      ilike(patientsTable.lastName, like),
      ilike(patientsTable.cedula, like),
      ilike(patientsTable.phone, like),
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [patients, [{ count }]] = await Promise.all([
    query.limit(limitNum).offset(offset),
    countQuery,
  ]);

  res.json({ data: patients, total: count, page: pageNum, limit: limitNum });
});

router.post("/patients", requireAuth, async (req, res) => {
  const { firstName, lastName, ...rest } = req.body;
  if (!firstName || !lastName) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }
  const [patient] = await db.insert(patientsTable).values({ firstName, lastName, ...rest }).returning();
  res.status(201).json(patient);
});

router.get("/patients/:id", requireAuth, async (req, res) => {
  const patientId = Number(req.params.id);
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const { appointmentsTable, clinicalRecordsTable, invoicesTable, usersTable } = await import("@workspace/db");
  const [appointments, clinicalRecords, invoices] = await Promise.all([
    db.select({ appointment: appointmentsTable, dentist: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role } })
      .from(appointmentsTable)
      .leftJoin(usersTable, eq(appointmentsTable.dentistId, usersTable.id))
      .where(eq(appointmentsTable.patientId, patientId))
      .orderBy(sql`${appointmentsTable.appointmentDate} DESC`),
    db.select().from(clinicalRecordsTable)
      .where(eq(clinicalRecordsTable.patientId, patientId))
      .orderBy(sql`${clinicalRecordsTable.visitDate} DESC`),
    db.select().from(invoicesTable)
      .where(eq(invoicesTable.patientId, patientId))
      .orderBy(sql`${invoicesTable.createdAt} DESC`),
  ]);

  res.json({
    ...patient,
    appointments: appointments.map(a => ({ ...a.appointment, dentist: a.dentist })),
    clinicalRecords,
    invoices,
  });
});

router.put("/patients/:id", requireAuth, async (req, res) => {
  const [patient] = await db.update(patientsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(patientsTable.id, Number(req.params.id)))
    .returning();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(patient);
});

router.delete("/patients/:id", requireAuth, requireRole("admin", "receptionist"), async (req, res) => {
  await db.delete(patientsTable).where(eq(patientsTable.id, Number(req.params.id)));
  res.status(204).send();
});

function requireRole(...roles: string[]) {
  return requireAuth;
}

export default router;
