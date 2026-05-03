import { Router } from "express";
import multer from "multer";
import { db, clinicalRecordAttachmentsTable, clinicalRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Se aceptan imágenes, PDF y documentos Word."));
    }
  },
});

router.get("/clinical-records/:id/attachments", requireAuth, async (req, res) => {
  const recordId = Number(req.params.id);
  const attachments = await db
    .select({
      id: clinicalRecordAttachmentsTable.id,
      clinicalRecordId: clinicalRecordAttachmentsTable.clinicalRecordId,
      originalName: clinicalRecordAttachmentsTable.originalName,
      mimeType: clinicalRecordAttachmentsTable.mimeType,
      fileSize: clinicalRecordAttachmentsTable.fileSize,
      uploadedAt: clinicalRecordAttachmentsTable.uploadedAt,
    })
    .from(clinicalRecordAttachmentsTable)
    .where(eq(clinicalRecordAttachmentsTable.clinicalRecordId, recordId))
    .orderBy(clinicalRecordAttachmentsTable.uploadedAt);
  res.json(attachments);
});

router.post(
  "/clinical-records/:id/attachments",
  requireAuth,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    const recordId = Number(req.params.id);

    const [record] = await db
      .select({ id: clinicalRecordsTable.id, dentistId: clinicalRecordsTable.dentistId })
      .from(clinicalRecordsTable)
      .where(eq(clinicalRecordsTable.id, recordId));

    if (!record) {
      res.status(404).json({ error: "Expediente no encontrado" });
      return;
    }

    if (req.user?.role === "dentist" && record.dentistId !== req.user.userId) {
      res.status(403).json({ error: "No tiene permiso para modificar este expediente" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }

    const fileData = req.file.buffer.toString("base64");

    const [attachment] = await db
      .insert(clinicalRecordAttachmentsTable)
      .values({
        clinicalRecordId: recordId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileData,
      })
      .returning({
        id: clinicalRecordAttachmentsTable.id,
        clinicalRecordId: clinicalRecordAttachmentsTable.clinicalRecordId,
        originalName: clinicalRecordAttachmentsTable.originalName,
        mimeType: clinicalRecordAttachmentsTable.mimeType,
        fileSize: clinicalRecordAttachmentsTable.fileSize,
        uploadedAt: clinicalRecordAttachmentsTable.uploadedAt,
      });

    res.status(201).json(attachment);
  }
);

router.get("/clinical-records/:id/attachments/:attachmentId/download", requireAuth, async (req, res) => {
  const attachmentId = Number(req.params.attachmentId);
  const [attachment] = await db
    .select()
    .from(clinicalRecordAttachmentsTable)
    .where(eq(clinicalRecordAttachmentsTable.id, attachmentId));

  if (!attachment) {
    res.status(404).json({ error: "Adjunto no encontrado" });
    return;
  }

  const buffer = Buffer.from(attachment.fileData, "base64");
  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

router.delete("/clinical-records/:id/attachments/:attachmentId", requireAuth, async (req: AuthRequest, res) => {
  const attachmentId = Number(req.params.attachmentId);
  const recordId = Number(req.params.id);

  if (req.user?.role === "dentist") {
    const [record] = await db
      .select({ dentistId: clinicalRecordsTable.dentistId })
      .from(clinicalRecordsTable)
      .where(eq(clinicalRecordsTable.id, recordId));
    if (!record || record.dentistId !== req.user.userId) {
      res.status(403).json({ error: "No tiene permiso" });
      return;
    }
  }

  await db.delete(clinicalRecordAttachmentsTable).where(eq(clinicalRecordAttachmentsTable.id, attachmentId));
  res.status(204).send();
});

export default router;
