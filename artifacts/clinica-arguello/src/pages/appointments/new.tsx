import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateAppointment,
  useListPatients,
  useListUsers,
  useCheckAvailability,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const apptSchema = z.object({
  patientId: z.string().min(1, "Paciente requerido"),
  dentistId: z.string().min(1, "Dentista requerido"),
  appointmentDate: z.string().min(1, "Fecha requerida"),
  appointmentTime: z.string().min(1, "Hora requerida"),
  durationMinutes: z.coerce.number().min(15),
  reason: z.string().min(1, "Motivo requerido"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof apptSchema>;

export default function NewAppointmentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createAppt = useCreateAppointment();
  const [patientSearch, setPatientSearch] = useState("");
  const debouncedPatientSearch = useDebounce(patientSearch, 300);

  const form = useForm<FormValues>({
    resolver: zodResolver(apptSchema),
    defaultValues: { patientId: "", dentistId: "", appointmentDate: new Date().toISOString().split("T")[0], appointmentTime: "", durationMinutes: 30, reason: "", notes: "" },
  });

  const watchDentistId = form.watch("dentistId");
  const watchDate = form.watch("appointmentDate");

  const { data: patients } = useListPatients(debouncedPatientSearch ? { search: debouncedPatientSearch } : undefined);
  const { data: users } = useListUsers();
  const dentists = users?.filter(u => u.role === "dentist" || u.role === "admin");

  const { data: availability } = useCheckAvailability(
    watchDentistId && watchDate
      ? { dentistId: watchDentistId, date: watchDate }
      : undefined,
    { query: { enabled: !!(watchDentistId && watchDate) } }
  );

  const onSubmit = (values: FormValues) => {
    createAppt.mutate({
      data: {
        patientId: Number(values.patientId),
        dentistId: Number(values.dentistId),
        appointmentDate: values.appointmentDate,
        appointmentTime: values.appointmentTime,
        durationMinutes: values.durationMinutes,
        reason: values.reason,
        notes: values.notes,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Cita agendada exitosamente" });
        setLocation("/appointments");
      },
      onError: (err: any) => {
        const msg = err?.data?.message ?? "No se pudo agendar la cita";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/appointments"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Cita</h1>
          <p className="text-sm text-muted-foreground">Agendar una nueva cita</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Detalles de la cita</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Patient search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar Paciente</label>
                <Input
                  placeholder="Nombre, cédula..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
              </div>
              <FormField control={form.control} name="patientId" render={({ field }) => (
                <FormItem><FormLabel>Paciente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {patients?.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName} — {p.cedula}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="dentistId" render={({ field }) => (
                <FormItem><FormLabel>Dentista *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar dentista" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {dentists?.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="appointmentDate" render={({ field }) => (
                  <FormItem><FormLabel>Fecha *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem><FormLabel>Duración (min)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[15,30,45,60,90,120].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>

              {/* Time slots */}
              <FormField control={form.control} name="appointmentTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora *</FormLabel>
                  {availability ? (
                    <div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-1">
                        {availability.availableSlots?.map((slot: string) => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => field.onChange(slot)}
                            className={`flex items-center justify-center gap-1 text-xs py-2 px-2 rounded border transition-colors ${
                              field.value === slot
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white text-foreground border-border hover:bg-muted"
                            }`}
                          >
                            <Clock className="h-3 w-3" />{slot}
                          </button>
                        ))}
                      </div>
                      {availability.availableSlots?.length === 0 && (
                        <p className="text-sm text-amber-600 mt-2">No hay horarios disponibles para este dentista en esta fecha.</p>
                      )}
                    </div>
                  ) : (
                    <FormControl><Input type="time" {...field} /></FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>Motivo de la cita *</FormLabel><FormControl><Input placeholder="Limpieza dental, extracción..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas adicionales</FormLabel><FormControl><Textarea rows={3} placeholder="Observaciones..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/appointments"><Button type="button" variant="outline">Cancelar</Button></Link>
                <Button type="submit" disabled={createAppt.isPending}>
                  {createAppt.isPending ? "Agendando..." : "Agendar Cita"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
