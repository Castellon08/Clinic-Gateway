import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordAttachments } from "@/components/RecordAttachments";
import { ArrowLeft, Printer } from "lucide-react";

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
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground font-medium col-span-1">{label}</span>
      <span className="text-sm col-span-2 whitespace-pre-wrap">{display}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-0">
        {children}
      </CardContent>
    </Card>
  );
}

interface ClinicalRecord {
  id: number;
  patientId: number;
  dentistId: number;
  visitDate: string;
  visitTime?: string;
  doctorName?: string;
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

export default function ClinicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);

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

  const handlePrint = () => {
    window.print();
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
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
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
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / Exportar
          </Button>
        </div>

        {/* Print header (visible only when printing) */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold">Clínica Odontológica Argüello</h1>
          <h2 className="text-lg font-semibold mt-1">Historia Clínica</h2>
          <p className="text-sm text-gray-600 mt-1">
            Paciente: {record.patient?.firstName} {record.patient?.lastName}
            {record.patient?.cedula ? ` | Cédula: ${record.patient.cedula}` : ""}
          </p>
          <p className="text-sm text-gray-600">Fecha: {formatDate(record.visitDate)}</p>
        </div>

        {/* Identificación */}
        <Section title="Datos de Identificación">
          <Row label="Fecha" value={formatDate(record.visitDate)} />
          <Row label="Hora" value={record.visitTime} />
          <Row label="Doctor" value={record.doctorName ?? record.dentist?.name} />
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

        {/* Motivo de consulta e historia */}
        <Section title="Motivo de Consulta e Historia">
          <Row label="Motivo de consulta" value={record.motivoConsulta} />
          <Row label="Historia de la enfermedad actual" value={record.historiaEnfermedadActual} />
          <Row label="Interrogatorio por aparatos y sistemas" value={record.interrogatorioSistemas} />
          <Row label="Antecedentes familiares patológicos" value={record.antecedentesFamiliares} />
        </Section>

        {/* Antecedentes */}
        {(record.enfermedadesInfectocontagiosas?.length || record.enfermedadesHereditarias?.length || record.otrasInfectocontagiosas || record.otrasHereditarias) ? (
          <Section title="Antecedentes Patológicos Personales">
            <Row label="Enfermedades infecto-contagiosas" value={record.enfermedadesInfectocontagiosas} />
            <Row label="Otras infecto-contagiosas" value={record.otrasInfectocontagiosas} />
            <Row label="Enfermedades hereditarias" value={record.enfermedadesHereditarias} />
            <Row label="Otras hereditarias" value={record.otrasHereditarias} />
          </Section>
        ) : null}

        {/* Signos vitales */}
        {(record.signosVitalesFc || record.signosVitalesFr || record.signosVitalesTa || record.signosVitalesTemp || record.peso || record.talla || record.imc) ? (
          <Section title="Signos Vitales y Antropometría">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              {record.signosVitalesFc && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">FC</p>
                  <p className="text-sm font-semibold">{record.signosVitalesFc}</p>
                </div>
              )}
              {record.signosVitalesFr && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">FR</p>
                  <p className="text-sm font-semibold">{record.signosVitalesFr}</p>
                </div>
              )}
              {record.signosVitalesTa && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">TA</p>
                  <p className="text-sm font-semibold">{record.signosVitalesTa}</p>
                </div>
              )}
              {record.signosVitalesTemp && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">T°</p>
                  <p className="text-sm font-semibold">{record.signosVitalesTemp}</p>
                </div>
              )}
              {record.peso && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="text-sm font-semibold">{record.peso}</p>
                </div>
              )}
              {record.talla && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Talla</p>
                  <p className="text-sm font-semibold">{record.talla}</p>
                </div>
              )}
              {record.areaSuperficieCorporal && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Área sup. corporal</p>
                  <p className="text-sm font-semibold">{record.areaSuperficieCorporal}</p>
                </div>
              )}
              {record.imc && (
                <div className="bg-muted/40 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">IMC</p>
                  <p className="text-sm font-semibold">{record.imc}</p>
                </div>
              )}
            </div>
          </Section>
        ) : null}

        {/* Examen físico */}
        {(record.aspectoGeneral || record.pielMucosas) ? (
          <Section title="Examen Físico General">
            <Row label="Aspecto general" value={record.aspectoGeneral} />
            <Row label="Piel y mucosas" value={record.pielMucosas} />
          </Section>
        ) : null}

        {/* Diagnósticos y tratamiento */}
        <Section title="Diagnóstico y Tratamiento Odontológico">
          <Row label="Diagnósticos / problemas odontológicos" value={record.diagnosticos} />
          <Row label="Plan de tratamiento" value={record.planTratamiento} />
          <Row label="Presupuesto" value={record.presupuesto} />
          <Row label="Tratamiento realizado" value={record.tratamientoRealizado} />
        </Section>

        {/* Exámenes complementarios */}
        {(record.examenRadiografico || record.fotos) ? (
          <Section title="Exámenes Complementarios">
            <Row label="Examen radiográfico" value={record.examenRadiografico} />
            <Row label="Fotos clínicas" value={record.fotos} />
          </Section>
        ) : null}

        {/* Resumen clínico */}
        <Section title="Resumen Clínico">
          <Row label="Motivo resumido" value={record.chiefComplaint} />
          <Row label="Diagnóstico" value={record.diagnosis} />
          <Row label="Tratamiento" value={record.treatment} />
          <Row label="Piezas dentales (FDI)" value={record.toothNumbers} />
          <Row label="Observaciones" value={record.observations} />
          <Row label="Próxima visita" value={record.nextVisitNotes} />
        </Section>

        {/* Adjuntos: radiografías y fotos */}
        <div className="no-print">
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

        {/* Footer for print */}
        <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>Clínica Odontológica Argüello — Historia Clínica generada el {new Date().toLocaleDateString("es-NI")}</p>
          {record.dentist && <p>Dentista: Dr. {record.dentist.name}</p>}
        </div>
      </div>
    </>
  );
}
