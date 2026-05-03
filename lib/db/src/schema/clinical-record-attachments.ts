import { pgTable, serial, integer, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { clinicalRecordsTable } from "./clinical-records";

export const clinicalRecordAttachmentsTable = pgTable("clinical_record_attachments", {
  id: serial("id").primaryKey(),
  clinicalRecordId: integer("clinical_record_id").notNull().references(() => clinicalRecordsTable.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  fileData: text("file_data").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type ClinicalRecordAttachment = typeof clinicalRecordAttachmentsTable.$inferSelect;
