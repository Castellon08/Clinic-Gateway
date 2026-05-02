import { Router } from "express";
import { db, appointmentsTable, patientsTable, usersTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

const WORK_HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];

function buildPatientSelect() {
  return {
    id: patientsTable.id,
    firstName: patientsTable.firstName,
    lastName: patientsTable.lastName,
    phone: patientsTable.phone,
    email: patientsTable.email,
    cedula: patientsTable.cedula,
  };
}

function buildDentistSelect() {
  return {
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
  };
}

router.get("/appointments/availability", requireAuth, async (req, res) => {
  const { dentistId, date } = req.query as Record<string, string>;
  if (!dentistId || !date) {
    res.status(400).json({ error: "dentistId and date are required" });
    return;
  }
  const booked = await db.select({ time: appointmentsTable.appointmentTime })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.dentistId, Number(dentistId)),
      eq(appointmentsTable.appointmentDate, date),
      sql`${appointmentsTable.status} NOT IN ('cancelled', 'no_show')`,
    ));
  const bookedSlots = booked.map(b => b.time);
  const availableSlots = WORK_HOURS.filter(h => !bookedSlots.includes(h));
  res.json({ date, dentistId: Number(dentistId), availableSlots, bookedSlots });
});

router.get("/appointments", requireAuth, async (req, res) => {
  const { date, dateFrom, dateTo, status, dentistId, patientId } = req.query as Record<string, string>;

  const conditions: ReturnType<typeof eq>[] = [];
  if (date) conditions.push(eq(appointmentsTable.appointmentDate, date));
  if (dateFrom) conditions.push(gte(appointmentsTable.appointmentDate, dateFrom));
  if (dateTo) conditions.push(lte(appointmentsTable.appointmentDate, dateTo));
  if (status) conditions.push(eq(appointmentsTable.status, status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"));
  if (dentistId) conditions.push(eq(appointmentsTable.dentistId, Number(dentistId)));
  if (patientId) conditions.push(eq(appointmentsTable.patientId, Number(patientId)));

  const rows = await db.select({
    appointment: appointmentsTable,
    patient: buildPatientSelect(),
    dentist: buildDentistSelect(),
  })
    .from(appointmentsTable)
    .leftJoin(patientsTable, eq(appointmentsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.dentistId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(appointmentsTable.appointmentDate, appointmentsTable.appointmentTime);

  res.json(rows.map(r => ({ ...r.appointment, patient: r.patient, dentist: r.dentist })));
});

router.post("/appointments", requireAuth, async (req, res) => {
  const { patientId, dentistId, appointmentDate, appointmentTime, durationMinutes = 30, reason, notes, status = "pending" } = req.body;
  if (!patientId || !dentistId || !appointmentDate || !appointmentTime) {
    res.status(400).json({ error: "patientId, dentistId, appointmentDate, appointmentTime are required" });
    return;
  }
  // Check conflicts
  const [conflict] = await db.select()
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.dentistId, Number(dentistId)),
      eq(appointmentsTable.appointmentDate, appointmentDate),
      eq(appointmentsTable.appointmentTime, appointmentTime),
      sql`${appointmentsTable.status} NOT IN ('cancelled', 'no_show')`,
    ));
  if (conflict) {
    res.status(409).json({ error: "Conflict", message: "Time slot already booked for this dentist" });
    return;
  }
  const [appt] = await db.insert(appointmentsTable)
    .values({ patientId, dentistId, appointmentDate, appointmentTime, durationMinutes, reason, notes, status })
    .returning();

  const [[patient], [dentist]] = await Promise.all([
    db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, appt.patientId)),
    db.select(buildDentistSelect()).from(usersTable).where(eq(usersTable.id, appt.dentistId)),
  ]);
  res.status(201).json({ ...appt, patient, dentist });
});

router.get("/appointments/:id", requireAuth, async (req, res) => {
  const [row] = await db.select({
    appointment: appointmentsTable,
    patient: buildPatientSelect(),
    dentist: buildDentistSelect(),
  })
    .from(appointmentsTable)
    .leftJoin(patientsTable, eq(appointmentsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.dentistId, usersTable.id))
    .where(eq(appointmentsTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ ...row.appointment, patient: row.patient, dentist: row.dentist });
});

router.put("/appointments/:id", requireAuth, async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["appointmentDate", "appointmentTime", "durationMinutes", "status", "reason", "notes", "dentistId"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key === "appointmentDate" ? "appointmentDate" : key] = req.body[key];
  }
  const [appt] = await db.update(appointmentsTable).set(updates).where(eq(appointmentsTable.id, Number(req.params.id))).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  const [[patient], [dentist]] = await Promise.all([
    db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, appt.patientId)),
    db.select(buildDentistSelect()).from(usersTable).where(eq(usersTable.id, appt.dentistId)),
  ]);
  res.json({ ...appt, patient, dentist });
});

router.delete("/appointments/:id", requireAuth, async (req, res) => {
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
