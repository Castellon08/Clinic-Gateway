import { Router } from "express";
import { db, patientsTable, appointmentsTable, clinicalRecordsTable, invoicesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, sql, inArray } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

router.get("/patients", requireAuth, async (req: AuthRequest, res) => {
  const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  let baseQuery = db.select().from(patientsTable);
  let countQ = db.select({ count: sql<number>`count(*)::int` }).from(patientsTable);

  // Dentist role: only see their own patients
  if (req.user?.role === "dentist") {
    const dentistId = req.user.userId;
    const patientIds = await db
      .selectDistinct({ patientId: appointmentsTable.patientId })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.dentistId, dentistId));
    const ids = patientIds.map(r => r.patientId);
    if (ids.length === 0) {
      res.json({ data: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
    baseQuery = baseQuery.where(inArray(patientsTable.id, ids)) as typeof baseQuery;
    countQ = countQ.where(inArray(patientsTable.id, ids)) as typeof countQ;
  }

  if (search) {
    const like = `%${search}%`;
    const condition = or(
      ilike(patientsTable.firstName, like),
      ilike(patientsTable.lastName, like),
      ilike(patientsTable.cedula, like),
      ilike(patientsTable.phone, like),
    );
    baseQuery = baseQuery.where(condition) as typeof baseQuery;
    countQ = countQ.where(condition) as typeof countQ;
  }

  const [patients, [{ count }]] = await Promise.all([
    baseQuery.limit(limitNum).offset(offset),
    countQ,
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

router.get("/patients/:id", requireAuth, async (req: AuthRequest, res) => {
  const patientId = Number(req.params.id);
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  // Dentist role: only see their own patients
  if (req.user?.role === "dentist") {
    const [appt] = await db.select().from(appointmentsTable)
      .where(eq(appointmentsTable.patientId, patientId))
      .limit(1);
    // Allow if they've ever had an appointment with this patient
    // For now we just allow if there's any connection, or we'll check dentistId
    const dentistAppt = await db.select().from(appointmentsTable)
      .where(eq(appointmentsTable.dentistId, req.user.userId))
      .limit(1);
    const patientIds = (await db.selectDistinct({ id: appointmentsTable.patientId }).from(appointmentsTable).where(eq(appointmentsTable.dentistId, req.user.userId))).map(r => r.id);
    if (!patientIds.includes(patientId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

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

router.put("/patients/:id/odontogram", requireAuth, async (req, res) => {
  const { odontogramData } = req.body;
  const [patient] = await db.update(patientsTable)
    .set({ odontogramData, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(patientsTable.id, Number(req.params.id)))
    .returning();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(patient);
});

router.delete("/patients/:id", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user || !["admin", "receptionist"].includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(patientsTable).where(eq(patientsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
