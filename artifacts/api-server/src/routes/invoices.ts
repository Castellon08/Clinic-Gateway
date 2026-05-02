import { Router } from "express";
import { db, invoicesTable, patientsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function buildPatientSelect() {
  return { id: patientsTable.id, firstName: patientsTable.firstName, lastName: patientsTable.lastName, phone: patientsTable.phone, email: patientsTable.email, cedula: patientsTable.cedula };
}

async function generateInvoiceNumber(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
  const num = String(count + 1).padStart(6, "0");
  return `INV-${new Date().getFullYear()}-${num}`;
}

router.get("/invoices", requireAuth, async (req, res) => {
  const { patientId, status, dateFrom, dateTo } = req.query as Record<string, string>;
  const conditions = [];
  if (patientId) conditions.push(eq(invoicesTable.patientId, Number(patientId)));
  if (status) conditions.push(eq(invoicesTable.status, status as "pending" | "paid" | "cancelled"));
  if (dateFrom) conditions.push(gte(invoicesTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(invoicesTable.createdAt, new Date(dateTo)));

  const rows = await db.select({
    invoice: invoicesTable,
    patient: buildPatientSelect(),
  })
    .from(invoicesTable)
    .leftJoin(patientsTable, eq(invoicesTable.patientId, patientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${invoicesTable.createdAt} DESC`);

  res.json(rows.map(r => ({ ...r.invoice, patient: r.patient })));
});

router.post("/invoices", requireAuth, async (req, res) => {
  const { patientId, items, appointmentId, notes, paymentMethod, status = "pending" } = req.body;
  if (!patientId || !items?.length) {
    res.status(400).json({ error: "patientId and items are required" });
    return;
  }
  const invoiceItems = items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));
  const subtotal = invoiceItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);
  const total = subtotal;
  const invoiceNumber = await generateInvoiceNumber();
  const [invoice] = await db.insert(invoicesTable).values({
    patientId, appointmentId, invoiceNumber, items: invoiceItems,
    subtotal: String(subtotal), total: String(total), status, paymentMethod, notes,
    paidAt: status === "paid" ? new Date() : undefined,
  }).returning();
  const [patient] = await db.select(buildPatientSelect()).from(patientsTable).where(eq(patientsTable.id, invoice.patientId));
  res.status(201).json({ ...invoice, patient });
});

router.get("/invoices/:id", requireAuth, async (req, res) => {
  const [row] = await db.select({ invoice: invoicesTable, patient: buildPatientSelect() })
    .from(invoicesTable)
    .leftJoin(patientsTable, eq(invoicesTable.patientId, patientsTable.id))
    .where(eq(invoicesTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row.invoice, patient: row.patient });
});

router.put("/invoices/:id", requireAuth, async (req, res) => {
  const { status, paymentMethod, notes, items } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
  if (notes !== undefined) updates.notes = notes;
  if (items !== undefined) {
    const invoiceItems = items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    const subtotal = invoiceItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);
    updates.items = invoiceItems;
    updates.subtotal = String(subtotal);
    updates.total = String(subtotal);
  }
  if (status === "paid" && !req.body.paidAt) updates.paidAt = new Date();
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
