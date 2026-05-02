import { Router } from "express";
import { db, invoicesTable, patientsTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

function buildPatientSelect() {
  return { id: patientsTable.id, firstName: patientsTable.firstName, lastName: patientsTable.lastName, phone: patientsTable.phone, email: patientsTable.email, cedula: patientsTable.cedula };
}

async function generateInvoiceNumber(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
  const num = String(count + 1).padStart(6, "0");
  return `INV-${new Date().getFullYear()}-${num}`;
}

function applyMarkup(items: Array<{ description: string; quantity: number; unitPrice: number }>, markupPercent: number) {
  const percent = Number.isFinite(markupPercent) ? Math.max(0, markupPercent) : 0;
  return items.map((item) => {
    const baseTotal = Number(item.quantity) * Number(item.unitPrice);
    const total = baseTotal + baseTotal * (percent / 100);
    return { ...item, baseTotal, total };
  });
}

router.get("/invoices", requireAuth, async (req: AuthRequest, res) => {
  const { patientId, status, dateFrom, dateTo } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq | typeof gte | typeof lte>[] = [];

  if (req.user?.role === "dentist") {
    const dentistId = req.user.userId;
    const patientIds = (await db.selectDistinct({ patientId: appointmentsTable.patientId })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.dentistId, dentistId))).map(r => r.patientId);
    if (patientIds.length === 0) {
      res.json([]);
      return;
    }
    conditions.push(inArray(invoicesTable.patientId, patientIds));
  } else if (patientId) {
    conditions.push(eq(invoicesTable.patientId, Number(patientId)));
  }

  if (!req.user || req.user.role !== "dentist") {
    if (patientId) conditions.push(eq(invoicesTable.patientId, Number(patientId)));
  }
  if (status) conditions.push(eq(invoicesTable.status, status as "pending" | "paid" | "cancelled"));
  if (dateFrom) conditions.push(gte(invoicesTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(invoicesTable.createdAt, new Date(dateTo)));

  const rows = await db.select({ invoice: invoicesTable, patient: buildPatientSelect() })
    .from(invoicesTable)
    .leftJoin(patientsTable, eq(invoicesTable.patientId, patientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${invoicesTable.createdAt} DESC`);

  res.json(rows.map(r => ({ ...r.invoice, patient: r.patient })));
});

router.post("/invoices", requireAuth, async (req: AuthRequest, res) => {
  const { patientId, items, appointmentId, notes, paymentMethod, status = "pending", markupPercent = 0 } = req.body;
  if (!patientId || !items?.length) { res.status(400).json({ error: "patientId and items are required" }); return; }
  const effectiveMarkup = req.user?.role === "admin" ? Number(markupPercent) : 0;
  const invoiceItems = applyMarkup(items, effectiveMarkup);
  const subtotal = invoiceItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);
  const invoiceNumber = await generateInvoiceNumber();
  const [invoice] = await db.insert(invoicesTable).values({
    patientId,
    appointmentId,
    invoiceNumber,
    items: invoiceItems.map(({ baseTotal, ...item }) => item),
    subtotal: String(subtotal),
    total: String(subtotal),
    status,
    paymentMethod,
    notes,
    paidAt: status === "paid" ? new Date() : undefined,
  }).returning();
  const [patient] = await db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, invoice.patientId));
  res.status(201).json({ ...invoice, patient, markupPercent: effectiveMarkup });
});

router.get("/invoices/:id", requireAuth, async (req, res) => {
  const [row] = await db.select({ invoice: invoicesTable, patient: buildPatientSelect() })
    .from(invoicesTable)
    .leftJoin(patientsTable, eq(invoicesTable.patientId, patientsTable.id))
    .where(eq(invoicesTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row.invoice, patient: row.patient });
});

router.put("/invoices/:id", requireAuth, async (req: AuthRequest, res) => {
  const { status, paymentMethod, notes, items, markupPercent } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
  if (notes !== undefined) updates.notes = notes;
  if (items !== undefined) {
    const effectiveMarkup = req.user?.role === "admin" ? Number(markupPercent) : 0;
    const invoiceItems = applyMarkup(items, effectiveMarkup);
    const subtotal = invoiceItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);
    updates.items = invoiceItems.map(({ baseTotal, ...item }) => item);
    updates.subtotal = String(subtotal);
    updates.total = String(subtotal);
  }
  if (status === "paid") updates.paidAt = new Date();
  const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, Number(req.params.id))).returning();
  if (!invoice) { res.status(404).json({ error: "Not found" }); return; }
  const [patient] = await db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, invoice.patientId));
  res.json({ ...invoice, patient });
});

router.delete("/invoices/:id", requireAuth, async (req, res) => {
  await db.delete(invoicesTable).where(eq(invoicesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
