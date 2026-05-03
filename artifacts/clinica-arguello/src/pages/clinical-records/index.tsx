import { useState } from "react";
import { Link } from "wouter";
import { useListClinicalRecords, useListPatients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Eye } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-NI", { year: "numeric", month: "short", day: "numeric" });
}

export default function ClinicalRecordsPage() {
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const { data: patientResponse } = useListPatients();
  const patients = patientResponse?.data ?? [];
  const { data: records, isLoading } = useListClinicalRecords(patientFilter !== "all" ? { patientId: Number(patientFilter) } : undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial Clínico</h1>
          <p className="text-sm text-muted-foreground mt-1">Expedientes clínicos de pacientes</p>
        </div>
        <Link href="/clinical-records/new">
          <Button><Plus className="h-4 w-4 mr-2" />Nueva Historia Clínica</Button>
        </Link>
      </div>
      <div className="flex gap-3">
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos los pacientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pacientes</SelectItem>
            {patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !records?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {patientFilter !== "all" ? "No hay historias clínicas para este paciente" : "No hay historias clínicas registradas"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id} className="hover:bg-muted/20 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {record.patient?.firstName} {record.patient?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{formatDate(record.visitDate)}</span>
                      {record.dentist && <span className="text-xs text-muted-foreground">Dr. {record.dentist.name}</span>}
                    </div>
                    <p className="text-sm text-foreground font-medium">{record.diagnosis}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{record.treatment}</p>
                  </div>
                  <Link href={`/clinical-records/${record.id}`}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Exportar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
