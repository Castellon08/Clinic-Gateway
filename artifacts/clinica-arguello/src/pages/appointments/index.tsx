import { useState } from "react";
import { Link } from "wouter";
import { useListAppointments, useUpdateAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-NI", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function AppointmentsPage() {
  const [date, setDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateAppt = useUpdateAppointment();

  const params: Record<string, string> = { date };
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: appointments, isLoading } = useListAppointments(params);

  function prevDay() {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  }
  function nextDay() {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split("T")[0]);
  }

  function handleStatusChange(id: number, status: string) {
    updateAppt.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Estado actualizado" });
      },
      onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Citas</h1>
          <p className="text-sm text-muted-foreground mt-1">Agenda y gestión de citas</p>
        </div>
        <Link href="/appointments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
          <Button variant="outline" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayStr())} className="text-xs">Hoy</Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="no_show">No asistió</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{formatDate(date)}</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i=><Skeleton key={i} className="h-24" />)}
          </div>
        ) : !appointments?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No hay citas para este día
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <Card key={appt.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="text-center shrink-0">
                        <div className="font-mono text-lg font-bold text-foreground">{appt.appointmentTime}</div>
                        <div className="text-xs text-muted-foreground">{appt.durationMinutes} min</div>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {appt.patient?.firstName} {appt.patient?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{appt.reason}</p>
                        {appt.dentist && <p className="text-xs text-muted-foreground">Dr. {appt.dentist.name}</p>}
                        {appt.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{appt.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={appt.status}
                        onValueChange={(val) => handleStatusChange(appt.id, val)}
                      >
                        <SelectTrigger className={`h-8 text-xs w-40 border ${STATUS_COLORS[appt.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
