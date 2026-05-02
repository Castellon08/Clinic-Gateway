import { pgTable, serial, text, date, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  cedula: text("cedula").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: date("birth_date"),
  gender: genderEnum("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  medicalNotes: text("medical_notes"),
  odontogramData: jsonb("odontogram_data").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
