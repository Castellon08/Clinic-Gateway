import { pgTable, serial, integer, text, numeric, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { appointmentsTable } from "./appointments";

export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  items: jsonb("items").notNull().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method"),
  notes: text("notes"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
