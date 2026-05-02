import { Router } from "express";
import { db, clinicalRecordsTable, patientsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

function patientSelect() {
  return { id: patientsTable.id, firstName: patientsTable.firstName, lastName: patientsTable.lastName, phone: patientsTable.phone, email: patientsTable.email, cedula: patientsTable.cedula };
}
function dentistSelect() {
  return { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role };
}

router.get("/clinical-records", requireAuth, async (req: AuthRequest, res) => {
  const { patientId, dentistId } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];

  // Dentist role: only see their own records
  if (req.user?.role === "dentist") {
    conditions.push(eq(clinicalRecordsTable.dentistId, req.user.userId));
  } else if (dentistId) {
    conditions.push(eq(clinicalRecordsTable.dentistId, Number(dentistId)));
  }

  if (patientId) conditions.push(eq(clinicalRecordsTable.patientId, Number(patientId)));

  const rows = await db.select({
    record: clinicalRecordsTable,
    patient: patientSelect(),
    dentist: dentistSelect(),
  })
    .from(clinicalRecordsTable)
    .leftJoin(patientsTable, eq(clinicalRecordsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(clinicalRecordsTable.dentistId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(clinicalRecordsTable.visitDate);

  res.json(rows.map(r => ({ ...r.record, patient: r.patient, dentist: r.dentist })));
});

router.post("/clinical-records", requireAuth, async (req: AuthRequest, res) => {
  let { patientId, dentistId, visitDate, diagnosis, treatment, ...rest } = req.body;
  if (!patientId || !visitDate || !diagnosis || !treatment) {
    res.status(400).json({ error: "patientId, visitDate, diagnosis, treatment are required" }); return;
  }
  // Dentist creates records with their own ID
  if (req.user?.role === "dentist") {
    dentistId = req.user.userId;
  }
  if (!dentistId) { res.status(400).json({ error: "dentistId is required" }); return; }

  const [record] = await db.insert(clinicalRecordsTable).values({ patientId, dentistId, visitDate, diagnosis, treatment, ...rest }).returning();
  const [[patient], [dentist]] = await Promise.all([
    db.select(patientSelect()).from(patientsTable).where(eq(patientsTable.id, record.patientId)),
    db.select(dentistSelect()).from(usersTable).where(eq(usersTable.id, record.dentistId)),
  ]);
  res.status(201).json({ ...record, patient, dentist });
});

router.get("/clinical-records/:id", requireAuth, async (req, res) => {
  const [row] = await db.select({ record: clinicalRecordsTable, patient: patientSelect(), dentist: dentistSelect() })
    .from(clinicalRecordsTable)
    .leftJoin(patientsTable, eq(clinicalRecordsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(clinicalRecordsTable.dentistId, usersTable.id))
    .where(eq(clinicalRecordsTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row.record, patient: row.patient, dentist: row.dentist });
});

router.put("/clinical-records/:id", requireAuth, async (req, res) => {
  const [record] = await db.update(clinicalRecordsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(clinicalRecordsTable.id, Number(req.params.id))).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  const [[patient], [dentist]] = await Promise.all([
    db.select(patientSelect()).from(patientsTable).where(eq(patientsTable.id, record.patientId)),
    db.select(dentistSelect()).from(usersTable).where(eq(usersTable.id, record.dentistId)),
  ]);
  res.json({ ...record, patient, dentist });
});

router.delete("/clinical-records/:id", requireAuth, async (req, res) => {
  await db.delete(clinicalRecordsTable).where(eq(clinicalRecordsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
