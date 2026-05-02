import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { usersTable } from "./users";
import { appointmentsTable } from "./appointments";

export const clinicalRecordsTable = pgTable("clinical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  dentistId: integer("dentist_id").notNull().references(() => usersTable.id),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id),
  visitDate: date("visit_date").notNull(),
  chiefComplaint: text("chief_complaint"),
  diagnosis: text("diagnosis").notNull(),
  treatment: text("treatment").notNull(),
  toothNumbers: text("tooth_numbers"),
  observations: text("observations"),
  nextVisitNotes: text("next_visit_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClinicalRecordSchema = createInsertSchema(clinicalRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClinicalRecord = z.infer<typeof insertClinicalRecordSchema>;
export type ClinicalRecord = typeof clinicalRecordsTable.$inferSelect;
