import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateClinicalRecord,
  useListPatients,
  useListUsers,
  getListClinicalRecordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const schema = z.object({
  patientId: z.string().min(1, "Paciente requerido"),
  dentistId: z.string().min(1, "Dentista requerido"),
  visitDate: z.string().min(1, "Fecha requerida"),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnóstico requerido"),
  treatment: z.string().min(1, "Tratamiento requerido"),
  toothNumbers: z.string().optional(),
  observations: z.string().optional(),
  nextVisitNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewClinicalRecordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRecord = useCreateClinicalRecord();
  const [patientSearch, setPatientSearch] = useState("");
  const debouncedSearch = useDebounce(patientSearch, 300);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: "", dentistId: "",
      visitDate: new Date().toISOString().split("T")[0],
      chiefComplaint: "", diagnosis: "", treatment: "", toothNumbers: "", observations: "", nextVisitNotes: "",
    },
  });

  const { data: patients } = useListPatients(debouncedSearch ? { search: debouncedSearch } : undefined);
  const { data: users } = useListUsers();
  const dentists = users?.filter(u => u.role === "dentist" || u.role === "admin");

  const onSubmit = (values: FormValues) => {
    createRecord.mutate({ data: { ...values, patientId: Number(values.patientId), dentistId: Number(values.dentistId) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClinicalRecordsQueryKey() });
        toast({ title: "Expediente creado exitosamente" });
        setLocation("/clinical-records");
      },
      onError: () => toast({ title: "Error", description: "No se pudo crear el expediente.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/clinical-records"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Expediente Clínico</h1>
          <p className="text-sm text-muted-foreground">Registro de visita clínica</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Datos de la visita</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar Paciente</label>
                <Input placeholder="Nombre, cédula..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
              </div>
              <FormField control={form.control} name="patientId" render={({ field }) => (
                <FormItem><FormLabel>Paciente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {patients?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName} — {p.cedula}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dentistId" render={({ field }) => (
                  <FormItem><FormLabel>Dentista *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {dentists?.map(d => <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="visitDate" render={({ field }) => (
                  <FormItem><FormLabel>Fecha de visita *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                <FormItem><FormLabel>Motivo de consulta</FormLabel><FormControl><Input placeholder="Dolor de muela, revisión..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="diagnosis" render={({ field }) => (
                <FormItem><FormLabel>Diagnóstico *</FormLabel><FormControl><Textarea rows={2} placeholder="Diagnóstico clínico..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="treatment" render={({ field }) => (
                <FormItem><FormLabel>Tratamiento realizado *</FormLabel><FormControl><Textarea rows={2} placeholder="Procedimientos y tratamientos..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="toothNumbers" render={({ field }) => (
                <FormItem><FormLabel>Piezas dentales</FormLabel><FormControl><Input placeholder="Ej: 11, 21, 36, 46" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea rows={2} placeholder="Observaciones adicionales..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nextVisitNotes" render={({ field }) => (
                <FormItem><FormLabel>Próxima visita</FormLabel><FormControl><Input placeholder="Instrucciones para la próxima visita..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-3 pt-2">
                <Link href="/clinical-records"><Button type="button" variant="outline">Cancelar</Button></Link>
                <Button type="submit" disabled={createRecord.isPending}>
                  {createRecord.isPending ? "Guardando..." : "Guardar Expediente"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
