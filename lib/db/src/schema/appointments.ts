import { pgTable, serial, integer, text, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { usersTable } from "./users";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending", "confirmed", "completed", "cancelled", "no_show"
]);

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  dentistId: integer("dentist_id").notNull().references(() => usersTable.id),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
