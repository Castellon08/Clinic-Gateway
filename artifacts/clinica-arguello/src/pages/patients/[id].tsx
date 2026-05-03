import { useParams, Link } from "wouter";
import {
  useGetPatient,
  useListAppointments,
  useListClinicalRecords,
  useListInvoices,
  useGetMe,
  getGetPatientQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Mail, MapPin, Heart, AlertCircle, Calendar, FileText, Receipt, User, Grid3X3 } from "lucide-react";
import { Odontogram, serializeOdontogram, parseOdontogram } from "@/components/Odontogram";
import { RecordAttachments } from "@/components/RecordAttachments";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-700 border-gray-200",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};
const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", cancelled: "bg-gray-100 text-gray-700",
};
const INVOICE_STATUS_LABELS: Record<string, string> = { pending: "Pendiente", paid: "Pagada", cancelled: "Cancelada" };
const GENDER_LABELS: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-NI", { year: "numeric", month: "long", day: "numeric" });
}
function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-NI", { year: "numeric", month: "short", day: "numeric" });
}
function calcAge(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}
function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(Number(amount));
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const [savingOdonto, setSavingOdonto] = useState(false);

  const { data: patient, isLoading: patientLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientQueryKey(patientId) }
  });
  const { data: appointments } = useListAppointments({ patientId });
  const { data: records } = useListClinicalRecords({ patientId });
  const { data: invoices } = useListInvoices({ patientId });

  const handleOdontogramChange = useCallback(async (value: string) => {
    setSavingOdonto(true);
    try {
      const token = localStorage.getItem("clinica_token");
      const res = await fetch(`/api/patients/${patientId}/odontogram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ odontogramData: value }),
      });
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
      toast({ title: "Odontograma actualizado" });
    } catch {
      toast({ title: "Error al guardar odontograma", variant: "destructive" });
    } finally {
      setSavingOdonto(false);
    }
  }, [patientId, queryClient, toast]);

  if (patientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente no encontrado.</p>
        <Link href="/patients"><Button variant="link" className="mt-2">Volver a pacientes</Button></Link>
      </div>
    );
  }

  const age = calcAge(patient.birthDate);
  const rawOdontogram = (patient as unknown as { odontogramData?: string | Record<string, unknown> }).odontogramData;
  const odontogramValue = typeof rawOdontogram === "string" ? rawOdontogram : rawOdontogram ? serializeOdontogram(parseOdontogram(JSON.stringify(rawOdontogram))) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{patient.firstName} {patient.lastName}</h1>
          <p className="text-sm text-muted-foreground">
            Cédula: {patient.cedula ?? "—"}{age !== null ? ` · ${age} años` : ""}
            {patient.gender ? ` · ${GENDER_LABELS[patient.gender] ?? patient.gender}` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {savingOdonto && <span className="text-xs text-muted-foreground">Guardando...</span>}
          {me?.role !== "dentist" && (
            <Link href={`/appointments/new`}>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />Nueva cita
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="profile" className="flex items-center gap-1 text-xs">
            <User className="h-3.5 w-3.5" />Perfil
          </TabsTrigger>
          <TabsTrigger value="odontogram" className="flex items-center gap-1 text-xs">
            <Grid3X3 className="h-3.5 w-3.5" />Odontograma
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" />Citas
            {appointments?.length ? <span className="ml-0.5 text-xs bg-muted rounded-full px-1.5">{appointments.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-1 text-xs">
            <FileText className="h-3.5 w-3.5" />Expediente
            {records?.length ? <span className="ml-0.5 text-xs bg-muted rounded-full px-1.5">{records.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1 text-xs">
            <Receipt className="h-3.5 w-3.5" />Facturas
            {invoices?.length ? <span className="ml-0.5 text-xs bg-muted rounded-full px-1.5">{invoices.length}</span> : null}
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Información de contacto</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{patient.address}</span>
                  </div>
                )}
                {!patient.phone && !patient.email && !patient.address && (
                  <p className="text-sm text-muted-foreground">Sin información de contacto</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Datos clínicos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {patient.birthDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Nacimiento: {formatDate(patient.birthDate)}</span>
                  </div>
                )}
                {patient.bloodType && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Tipo de sangre: <strong>{patient.bloodType}</strong></span>
                  </div>
                )}
                {patient.allergies && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Alergias: <span className="text-amber-700 font-medium">{patient.allergies}</span></span>
                  </div>
                )}
                {patient.medicalNotes && (
                  <div className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">
                    <p className="font-medium text-foreground mb-1">Notas médicas</p>
                    <p>{patient.medicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ODONTOGRAM TAB */}
        <TabsContent value="odontogram" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Odontograma — Sistema FDI</CardTitle>
              <p className="text-sm text-muted-foreground">Haga clic en una pieza dental para registrar su estado</p>
            </CardHeader>
            <CardContent>
              <Odontogram
                value={odontogramValue}
                onChange={handleOdontogramChange}
                readonly={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">{appointments?.length ?? 0} cita{appointments?.length !== 1 ? "s" : ""} registrada{appointments?.length !== 1 ? "s" : ""}</p>
            <Link href="/appointments/new">
              <Button size="sm">Nueva cita</Button>
            </Link>
          </div>
          {!appointments?.length ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin citas registradas</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {(appointments as unknown as { id: number; appointmentDate: string; appointmentTime: string; reason?: string; status: string; dentist?: { name: string } }[]).map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{formatDate(appt.appointmentDate)}</span>
                      <span className="text-sm text-muted-foreground">a las {appt.appointmentTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{appt.reason}</p>
                      {appt.dentist && <span className="text-xs text-muted-foreground">· Dr. {appt.dentist.name}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[appt.status] ?? ""}`}>
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CLINICAL RECORDS TAB */}
        <TabsContent value="records" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">{records?.length ?? 0} registro{records?.length !== 1 ? "s" : ""} clínico{records?.length !== 1 ? "s" : ""}</p>
            <Link href="/clinical-records/new">
              <Button size="sm">Nuevo expediente</Button>
            </Link>
          </div>
          {!records?.length ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin expedientes clínicos</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <Card key={record.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{formatDate(record.visitDate)}</span>
                          {record.dentist && <span className="text-xs text-muted-foreground">Dr. {record.dentist.name}</span>}
                        </div>
                        {record.chiefComplaint && <p className="text-xs text-muted-foreground mb-1">Motivo: {record.chiefComplaint}</p>}
                        <p className="text-sm font-medium">{record.diagnosis}</p>
                        <p className="text-sm text-muted-foreground">{record.treatment}</p>
                        {record.toothNumbers && <p className="text-xs text-muted-foreground mt-1">Piezas: {record.toothNumbers}</p>}
                        {record.observations && <p className="text-xs text-muted-foreground mt-1">Obs: {record.observations}</p>}
                        {record.nextVisitNotes && <p className="text-xs text-muted-foreground mt-1 italic">Próxima visita: {record.nextVisitNotes}</p>}
                      </div>
                    </div>
                    <RecordAttachments recordId={record.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">{invoices?.length ?? 0} factura{invoices?.length !== 1 ? "s" : ""}</p>
            <Link href="/invoices/new">
              <Button size="sm">Nueva factura</Button>
            </Link>
          </div>
          {!invoices?.length ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin facturas</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(invoice.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatCurrency(invoice.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_COLORS[invoice.status] ?? ""}`}>
                      {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
