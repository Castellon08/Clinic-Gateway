import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordAttachments } from "@/components/RecordAttachments";
import { ArrowLeft, FileDown } from "lucide-react";
import { Odontogram } from "@/components/Odontogram";

function getToken() {
  return localStorage.getItem("clinica_token") ?? "";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-NI", { year: "numeric", month: "long", day: "numeric" });
}

function Row({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px", padding: "6px 0", borderBottom: "1px solid #e5e7eb" }}>
      <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>{display}</span>
    </div>
  );
}

function SectionPrint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ background: "#f9fafb", padding: "8px 16px", borderBottom: "1px solid #e5e7eb" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280" }}>{title}</span>
      </div>
      <div style={{ padding: "8px 16px" }}>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-0">{children}</CardContent>
    </Card>
  );
}

interface ClinicalRecord {
  id: number;
  patientId: number;
  dentistId: number;
  visitDate: string;
  visitTime?: string;
  doctorMinsaCode?: string;
  service?: string;
  age?: string;
  birthPlace?: string;
  sex?: string;
  procedence?: string;
  escolaridad?: string;
  profession?: string;
  addressHabitual?: string;
  fatherName?: string;
  motherName?: string;
  motivoConsulta?: string;
  historiaEnfermedadActual?: string;
  interrogatorioSistemas?: string;
  antecedentesFamiliares?: string;
  enfermedadesInfectocontagiosas?: string[];
  enfermedadesHereditarias?: string[];
  otrasInfectocontagiosas?: string;
  otrasHereditarias?: string;
  signosVitalesFc?: string;
  signosVitalesFr?: string;
  signosVitalesTa?: string;
  signosVitalesTemp?: string;
  peso?: string;
  talla?: string;
  areaSuperficieCorporal?: string;
  imc?: string;
  aspectoGeneral?: string;
  pielMucosas?: string;
  examenRadiografico?: string;
  fotos?: string;
  diagnosticos?: string;
  planTratamiento?: string;
  presupuesto?: string;
  tratamientoRealizado?: string;
  chiefComplaint?: string;
  diagnosis: string;
  treatment: string;
  toothNumbers?: string;
  observations?: string;
  nextVisitNotes?: string;
  patient?: { id: number; firstName: string; lastName: string; cedula?: string };
  dentist?: { id: number; name: string };
  createdAt?: string;
}

function buildPrintHtml(record: ClinicalRecord): string {
  const val = (v?: string | string[] | null) => {
    if (!v || (Array.isArray(v) && v.length === 0)) return null;
    return Array.isArray(v) ? v.join(", ") : v;
  };

  const row = (label: string, value?: string | string[] | null) => {
    const v = val(value);
    if (!v) return "";
    return `<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
      <span style="font-size:13px;color:#6b7280;font-weight:500;">${label}</span>
      <span style="font-size:13px;white-space:pre-wrap;">${v}</span>
    </div>`;
  };

  const section = (title: string, content: string) => {
    if (!content.trim()) return "";
    return `<div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:#f9fafb;padding:8px 16px;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">${title}</span>
      </div>
      <div style="padding:8px 16px;">${content}</div>
    </div>`;
  };

  const vitalesHtml = [
    record.signosVitalesFc ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">FC</p><p style="font-size:13px;font-weight:600;margin:0">${record.signosVitalesFc}</p></div>` : "",
    record.signosVitalesFr ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">FR</p><p style="font-size:13px;font-weight:600;margin:0">${record.signosVitalesFr}</p></div>` : "",
    record.signosVitalesTa ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">TA</p><p style="font-size:13px;font-weight:600;margin:0">${record.signosVitalesTa}</p></div>` : "",
    record.signosVitalesTemp ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">T°</p><p style="font-size:13px;font-weight:600;margin:0">${record.signosVitalesTemp}</p></div>` : "",
    record.peso ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">Peso</p><p style="font-size:13px;font-weight:600;margin:0">${record.peso}</p></div>` : "",
    record.talla ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">Talla</p><p style="font-size:13px;font-weight:600;margin:0">${record.talla}</p></div>` : "",
    record.areaSuperficieCorporal ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">Área sup.</p><p style="font-size:13px;font-weight:600;margin:0">${record.areaSuperficieCorporal}</p></div>` : "",
    record.imc ? `<div style="background:#f3f4f6;border-radius:6px;padding:8px;text-align:center;"><p style="font-size:11px;color:#6b7280;margin:0">IMC</p><p style="font-size:13px;font-weight:600;margin:0">${record.imc}</p></div>` : "",
  ].filter(Boolean).join("");

  const patientName = `${record.patient?.firstName ?? ""} ${record.patient?.lastName ?? ""}`.trim();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; background: white; padding: 24px; width: 794px; }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="font-size:20px;font-weight:700;">Clínica Odontológica Argüello</h1>
    <h2 style="font-size:16px;font-weight:600;margin-top:4px;">Historia Clínica</h2>
    <p style="font-size:13px;color:#4b5563;margin-top:6px;">Paciente: ${patientName}${record.patient?.cedula ? " | Cédula: " + record.patient.cedula : ""}</p>
    <p style="font-size:13px;color:#4b5563;">Fecha: ${formatDate(record.visitDate)}</p>
    ${record.dentist?.name ? `<p style="font-size:13px;color:#4b5563;">Dentista: ${record.dentist.name}${record.doctorMinsaCode ? " | Código MINSA: " + record.doctorMinsaCode : ""}</p>` : ""}
  </div>

  ${section("Datos de Identificación",
    row("Fecha", formatDate(record.visitDate)) +
    row("Hora", record.visitTime) +
    row("Dentista", record.dentist?.name) +
    row("Código MINSA", record.doctorMinsaCode) +
    row("Servicio", record.service) +
    row("Paciente", patientName) +
    row("Edad", record.age) +
    row("Fecha / Lugar de nacimiento", record.birthPlace) +
    row("Sexo", record.sex) +
    row("Procedencia", record.procedence) +
    row("Escolaridad", record.escolaridad) +
    row("Profesión u oficio", record.profession) +
    row("Dirección habitual", record.addressHabitual) +
    row("Nombre del padre", record.fatherName) +
    row("Nombre de la madre", record.motherName)
  )}

  ${section("Motivo de Consulta e Historia",
    row("Motivo de consulta", record.motivoConsulta) +
    row("Historia de la enfermedad actual", record.historiaEnfermedadActual) +
    row("Interrogatorio por aparatos y sistemas", record.interrogatorioSistemas) +
    row("Antecedentes familiares patológicos", record.antecedentesFamiliares)
  )}

  ${(record.enfermedadesInfectocontagiosas?.length || record.enfermedadesHereditarias?.length || record.otrasInfectocontagiosas || record.otrasHereditarias) ? section("Antecedentes Patológicos Personales",
    row("Enfermedades infecto-contagiosas", record.enfermedadesInfectocontagiosas) +
    row("Otras infecto-contagiosas", record.otrasInfectocontagiosas) +
    row("Enfermedades hereditarias", record.enfermedadesHereditarias) +
    row("Otras hereditarias", record.otrasHereditarias)
  ) : ""}

  ${vitalesHtml ? section("Signos Vitales y Antropometría", `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0;">${vitalesHtml}</div>`) : ""}

  ${(record.aspectoGeneral || record.pielMucosas) ? section("Examen Físico General",
    row("Aspecto general", record.aspectoGeneral) +
    row("Piel y mucosas", record.pielMucosas)
  ) : ""}

  ${section("Diagnóstico y Tratamiento Odontológico",
    row("Diagnósticos / problemas odontológicos", record.diagnosticos) +
    row("Plan de tratamiento", record.planTratamiento) +
    row("Presupuesto", record.presupuesto) +
    row("Tratamiento realizado", record.tratamientoRealizado)
  )}

  ${(record.examenRadiografico || record.fotos) ? section("Exámenes Complementarios",
    row("Examen radiográfico", record.examenRadiografico) +
    row("Fotos clínicas", record.fotos)
  ) : ""}

  ${section("Resumen Clínico",
    row("Motivo resumido", record.chiefComplaint) +
    row("Diagnóstico", record.diagnosis) +
    row("Tratamiento", record.treatment) +
    row("Piezas dentales (FDI)", record.toothNumbers) +
    row("Observaciones", record.observations) +
    row("Próxima visita", record.nextVisitNotes)
  )}

  <div style="text-align:center;font-size:11px;color:#6b7280;margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;">
    <p>Clínica Odontológica Argüello — Historia Clínica generada el ${new Date().toLocaleDateString("es-NI")}</p>
    ${record.dentist ? `<p>Dentista: ${record.dentist.name}</p>` : ""}
  </div>
</body>
</html>`;
}

export default function ClinicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);
  const [exporting, setExporting] = useState(false);

  const { data: record, isLoading } = useQuery<ClinicalRecord>({
    queryKey: ["clinical-records", recordId],
    queryFn: async () => {
      const res = await fetch(`/api/clinical-records/${recordId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("No encontrado");
      return res.json();
    },
    enabled: !!recordId,
  });

  const handleExportPDF = async () => {
    if (!record) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const html = buildPrintHtml(record);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc2 = iframe.contentDocument!;
      doc2.open();
      doc2.write(html);
      doc2.close();

      await new Promise(r => setTimeout(r, 600));

      const canvas = await html2canvas(doc2.body, {
        scale: 2,
        useCORS: true,
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let yOffset = 0;
      let remaining = imgHeight;
      let page = 0;

      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        const srcY = (page * pageHeight * canvas.width) / pageWidth;
        const srcH = Math.min((pageHeight * canvas.width) / pageWidth, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
        const sliceHeight = (srcH * pageWidth) / canvas.width;
        pdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeight);
        remaining -= pageHeight;
        page++;
      }

      const patientName = `${record.patient?.firstName ?? ""}_${record.patient?.lastName ?? ""}`.replace(/\s+/g, "_");
      pdf.save(`Historia_Clinica_${patientName}_${record.visitDate}.pdf`);
      document.body.removeChild(iframe);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Historia clínica no encontrada.</p>
        <Link href="/clinical-records">
          <Button variant="link" className="mt-2">Volver al historial</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clinical-records">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historia Clínica</h1>
            <p className="text-sm text-muted-foreground">
              {record.patient?.firstName} {record.patient?.lastName}
              {record.patient?.cedula ? ` — Cédula: ${record.patient.cedula}` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
          <FileDown className="h-4 w-4 mr-2" />
          {exporting ? "Generando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      <Section title="Datos de Identificación">
        <Row label="Fecha" value={formatDate(record.visitDate)} />
        <Row label="Hora" value={record.visitTime} />
        <Row label="Dentista" value={record.dentist?.name} />
        <Row label="Código MINSA" value={record.doctorMinsaCode} />
        <Row label="Servicio" value={record.service} />
        <Row label="Paciente" value={`${record.patient?.firstName ?? ""} ${record.patient?.lastName ?? ""}`} />
        <Row label="Edad" value={record.age} />
        <Row label="Fecha / Lugar de nacimiento" value={record.birthPlace} />
        <Row label="Sexo" value={record.sex} />
        <Row label="Procedencia" value={record.procedence} />
        <Row label="Escolaridad" value={record.escolaridad} />
        <Row label="Profesión u oficio" value={record.profession} />
        <Row label="Dirección habitual" value={record.addressHabitual} />
        <Row label="Nombre del padre" value={record.fatherName} />
        <Row label="Nombre de la madre" value={record.motherName} />
      </Section>

      <Section title="Motivo de Consulta e Historia">
        <Row label="Motivo de consulta" value={record.motivoConsulta} />
        <Row label="Historia de la enfermedad actual" value={record.historiaEnfermedadActual} />
        <Row label="Interrogatorio por aparatos y sistemas" value={record.interrogatorioSistemas} />
        <Row label="Antecedentes familiares patológicos" value={record.antecedentesFamiliares} />
      </Section>

      {(record.enfermedadesInfectocontagiosas?.length || record.enfermedadesHereditarias?.length || record.otrasInfectocontagiosas || record.otrasHereditarias) ? (
        <Section title="Antecedentes Patológicos Personales">
          <Row label="Enfermedades infecto-contagiosas" value={record.enfermedadesInfectocontagiosas} />
          <Row label="Otras infecto-contagiosas" value={record.otrasInfectocontagiosas} />
          <Row label="Enfermedades hereditarias" value={record.enfermedadesHereditarias} />
          <Row label="Otras hereditarias" value={record.otrasHereditarias} />
        </Section>
      ) : null}

      {(record.signosVitalesFc || record.signosVitalesFr || record.signosVitalesTa || record.signosVitalesTemp || record.peso || record.talla || record.imc) ? (
        <Section title="Signos Vitales y Antropometría">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            {record.signosVitalesFc && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">FC</p><p className="text-sm font-semibold">{record.signosVitalesFc}</p></div>}
            {record.signosVitalesFr && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">FR</p><p className="text-sm font-semibold">{record.signosVitalesFr}</p></div>}
            {record.signosVitalesTa && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">TA</p><p className="text-sm font-semibold">{record.signosVitalesTa}</p></div>}
            {record.signosVitalesTemp && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">T°</p><p className="text-sm font-semibold">{record.signosVitalesTemp}</p></div>}
            {record.peso && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Peso</p><p className="text-sm font-semibold">{record.peso}</p></div>}
            {record.talla && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Talla</p><p className="text-sm font-semibold">{record.talla}</p></div>}
            {record.areaSuperficieCorporal && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">Área sup. corporal</p><p className="text-sm font-semibold">{record.areaSuperficieCorporal}</p></div>}
            {record.imc && <div className="bg-muted/40 rounded p-2 text-center"><p className="text-xs text-muted-foreground">IMC</p><p className="text-sm font-semibold">{record.imc}</p></div>}
          </div>
        </Section>
      ) : null}

      {(record.aspectoGeneral || record.pielMucosas) ? (
        <Section title="Examen Físico General">
          <Row label="Aspecto general" value={record.aspectoGeneral} />
          <Row label="Piel y mucosas" value={record.pielMucosas} />
        </Section>
      ) : null}

      <Section title="Diagnóstico y Tratamiento Odontológico">
        <Row label="Diagnósticos / problemas odontológicos" value={record.diagnosticos} />
        <Row label="Plan de tratamiento" value={record.planTratamiento} />
        <Row label="Presupuesto" value={record.presupuesto} />
        <Row label="Tratamiento realizado" value={record.tratamientoRealizado} />
      </Section>

      {(record.examenRadiografico || record.fotos) ? (
        <Section title="Exámenes Complementarios">
          <Row label="Examen radiográfico" value={record.examenRadiografico} />
          <Row label="Fotos clínicas" value={record.fotos} />
        </Section>
      ) : null}

      <Section title="Resumen Clínico">
        <Row label="Motivo resumido" value={record.chiefComplaint} />
        <Row label="Diagnóstico" value={record.diagnosis} />
        <Row label="Tratamiento" value={record.treatment} />
        <div className="py-2">
          <p className="text-sm font-medium mb-2">Odontograma</p>
          <Odontogram value={record.toothNumbers} />
        </div>
        <Row label="Observaciones" value={record.observations} />
        <Row label="Próxima visita" value={record.nextVisitNotes} />
      </Section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Radiografías y Archivos Adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <RecordAttachments recordId={recordId} />
        </CardContent>
      </Card>
    </div>
  );
}
