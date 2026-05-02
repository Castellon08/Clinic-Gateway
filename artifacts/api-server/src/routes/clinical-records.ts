import { Router } from "express";
import { db, clinicalRecordsTable, patientsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function buildPatientSelect() {
  return { id: patientsTable.id, firstName: patientsTable.firstName, lastName: patientsTable.lastName, phone: patientsTable.phone, email: patientsTable.email, cedula: patientsTable.cedula };
}
function buildDentistSelect() {
  return { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role };
}

router.get("/clinical-records", requireAuth, async (req, res) => {
  const { patientId, dentistId } = req.query as Record<string, string>;
  const conditions = [];
  if (patientId) conditions.push(eq(clinicalRecordsTable.patientId, Number(patientId)));
  if (dentistId) conditions.push(eq(clinicalRecordsTable.dentistId, Number(dentistId)));

  const rows = await db.select({
    record: clinicalRecordsTable,
    patient: buildPatientSelect(),
    dentist: buildDentistSelect(),
  })
    .from(clinicalRecordsTable)
    .leftJoin(patientsTable, eq(clinicalRecordsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(clinicalRecordsTable.dentistId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(clinicalRecordsTable.visitDate);

  res.json(rows.map(r => ({ ...r.record, patient: r.patient, dentist: r.dentist })));
});

router.post("/clinical-records", requireAuth, async (req, res) => {
  const { patientId, dentistId, visitDate, diagnosis, treatment, ...rest } = req.body;
  if (!patientId || !dentistId || !visitDate || !diagnosis || !treatment) {
    res.status(400).json({ error: "patientId, dentistId, visitDate, diagnosis, treatment are required" });
    return;
  }
  const [record] = await db.insert(clinicalRecordsTable).values({ patientId, dentistId, visitDate, diagnosis, treatment, ...rest }).returning();
  const [[patient], [dentist]] = await Promise.all([
    db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, record.patientId)),
    db.select(buildDentistSelect()).from(usersTable).where(eq(usersTable.id, record.dentistId)),
  ]);
  res.status(201).json({ ...record, patient, dentist });
});

router.get("/clinical-records/:id", requireAuth, async (req, res) => {
  const [row] = await db.select({
    record: clinicalRecordsTable,
    patient: buildPatientSelect(),
    dentist: buildDentistSelect(),
  })
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
    db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, record.patientId)),
    db.select(buildDentistSelect()).from(usersTable).where(eq(usersTable.id, record.dentistId)),
  ]);
  res.json({ ...record, patient, dentist });
});

router.delete("/clinical-records/:id", requireAuth, async (req, res) => {
  await db.delete(clinicalRecordsTable).where(eq(clinicalRecordsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
