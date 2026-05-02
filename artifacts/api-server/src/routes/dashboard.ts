import { Router } from "express";
import { db, appointmentsTable, patientsTable, usersTable, invoicesTable, inventoryTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [
    [{ totalPatients }],
    [{ newPatientsThisMonth }],
    apptToday,
    [{ totalRevenueThisMonth }],
    [{ totalPendingInvoices, pendingInvoicesAmount }],
    [{ lowStockCount }],
    [{ appointmentsThisWeek }],
  ] = await Promise.all([
    db.select({ totalPatients: sql<number>`count(*)::int` }).from(patientsTable),
    db.select({ newPatientsThisMonth: sql<number>`count(*)::int` }).from(patientsTable).where(gte(patientsTable.createdAt, new Date(firstOfMonth))),
    db.select({ status: appointmentsTable.status }).from(appointmentsTable).where(eq(appointmentsTable.appointmentDate, today)),
    db.select({ totalRevenueThisMonth: sql<number>`coalesce(sum(total::numeric), 0)` }).from(invoicesTable).where(and(eq(invoicesTable.status, "paid"), gte(invoicesTable.paidAt, new Date(firstOfMonth)))),
    db.select({ totalPendingInvoices: sql<number>`count(*)::int`, pendingInvoicesAmount: sql<number>`coalesce(sum(total::numeric), 0)` }).from(invoicesTable).where(eq(invoicesTable.status, "pending")),
    db.select({ lowStockCount: sql<number>`count(*)::int` }).from(inventoryTable).where(sql`quantity::numeric <= min_quantity::numeric`),
    db.select({ appointmentsThisWeek: sql<number>`count(*)::int` }).from(appointmentsTable).where(and(
      gte(appointmentsTable.appointmentDate, new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]),
      sql`${appointmentsTable.status} NOT IN ('cancelled', 'no_show')`
    )),
  ]);

  const totalAppointmentsToday = apptToday.length;
  const completedAppointmentsToday = apptToday.filter(a => a.status === "completed").length;
  const pendingAppointmentsToday = apptToday.filter(a => a.status === "pending" || a.status === "confirmed").length;

  res.json({
    totalPatients,
    totalAppointmentsToday,
    completedAppointmentsToday,
    pendingAppointmentsToday,
    totalRevenueThisMonth: Number(totalRevenueThisMonth),
    totalPendingInvoices,
    pendingInvoicesAmount: Number(pendingInvoicesAmount),
    lowStockCount,
    newPatientsThisMonth,
    appointmentsThisWeek,
  });
});

router.get("/dashboard/appointments-today", requireAuth, async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db.select({
    appointment: appointmentsTable,
    patient: { id: patientsTable.id, firstName: patientsTable.firstName, lastName: patientsTable.lastName, phone: patientsTable.phone, email: patientsTable.email, cedula: patientsTable.cedula },
    dentist: { id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role },
  })
    .from(appointmentsTable)
    .leftJoin(patientsTable, eq(appointmentsTable.patientId, patientsTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.dentistId, usersTable.id))
    .where(eq(appointmentsTable.appointmentDate, today))
    .orderBy(appointmentsTable.appointmentTime);
  res.json(rows.map(r => ({ ...r.appointment, patient: r.patient, dentist: r.dentist })));
});

router.get("/dashboard/recent-patients", requireAuth, async (_req, res) => {
  const patients = await db.select().from(patientsTable).orderBy(sql`${patientsTable.createdAt} DESC`).limit(10);
  res.json(patients);
});

router.get("/dashboard/revenue-by-month", requireAuth, async (_req, res) => {
  const year = new Date().getFullYear();
  const rows = await db.select({
    monthNumber: sql<number>`EXTRACT(MONTH FROM paid_at)::int`,
    revenue: sql<number>`coalesce(sum(total::numeric), 0)`,
    invoiceCount: sql<number>`count(*)::int`,
  })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.status, "paid"), sql`EXTRACT(YEAR FROM paid_at) = ${year}`))
    .groupBy(sql`EXTRACT(MONTH FROM paid_at)`)
    .orderBy(sql`EXTRACT(MONTH FROM paid_at)`);

  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  res.json(rows.map(r => ({
    monthNumber: r.monthNumber,
    month: MONTHS[r.monthNumber - 1],
    revenue: Number(r.revenue),
    invoiceCount: r.invoiceCount,
  })));
});

router.get("/dashboard/low-stock-alerts", requireAuth, async (_req, res) => {
  const items = await db.select().from(inventoryTable).where(sql`quantity::numeric <= min_quantity::numeric`).orderBy(inventoryTable.name);
  res.json(items.map(item => ({
    ...item,
    quantity: Number(item.quantity),
    minQuantity: Number(item.minQuantity),
    unitCost: item.unitCost !== null ? Number(item.unitCost) : null,
    isLowStock: true,
  })));
});

export default router;
