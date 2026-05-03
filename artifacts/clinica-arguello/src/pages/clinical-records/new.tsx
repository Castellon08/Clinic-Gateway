import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateClinicalRecord,
  useListPatients,
  useListUsers,
  useGetMe,
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
  visitTime: z.string().optional(),
  doctorName: z.string().optional(),
  service: z.string().optional(),
  age: z.string().optional(),
  birthPlace: z.string().optional(),
  sex: z.string().optional(),
  procedence: z.string().optional(),
  escolaridad: z.string().optional(),
  profession: z.string().optional(),
  addressHabitual: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  motivoConsulta: z.string().optional(),
  historiaEnfermedadActual: z.string().optional(),
  interrogatorioSistemas: z.string().optional(),
  antecedentesFamiliares: z.string().optional(),
  enfermedadesInfectocontagiosas: z.string().optional(),
  enfermedadesHereditarias: z.string().optional(),
  otrasInfectocontagiosas: z.string().optional(),
  otrasHereditarias: z.string().optional(),
  signosVitalesFc: z.string().optional(),
  signosVitalesFr: z.string().optional(),
  signosVitalesTa: z.string().optional(),
  signosVitalesTemp: z.string().optional(),
  peso: z.string().optional(),
  talla: z.string().optional(),
  areaSuperficieCorporal: z.string().optional(),
  imc: z.string().optional(),
  aspectoGeneral: z.string().optional(),
  pielMucosas: z.string().optional(),
  diagnosticos: z.string().optional(),
  planTratamiento: z.string().optional(),
  presupuesto: z.string().optional(),
  tratamientoRealizado: z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnóstico requerido"),
  treatment: z.string().min(1, "Tratamiento requerido"),
  toothNumbers: z.string().optional(),
  observations: z.string().optional(),
  nextVisitNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getToken() {
  return localStorage.getItem("clinica_token") ?? "";
}

export default function NewClinicalRecordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRecord = useCreateClinicalRecord();
  const [patientSearch, setPatientSearch] = useState("");
  const [radiograficoFile, setRadiograficoFile] = useState<File | null>(null);
  const [fotosFile, setFotosFile] = useState<File | null>(null);
  const debouncedSearch = useDebounce(patientSearch, 300);
  const { data: me } = useGetMe();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: "",
      dentistId: me?.role === "dentist" ? String(me.id) : "",
      visitDate: new Date().toISOString().split("T")[0],
      visitTime: "",
      doctorName: "",
      service: "",
      age: "",
      birthPlace: "",
      sex: "",
      procedence: "",
      escolaridad: "",
      profession: "",
      addressHabitual: "",
      fatherName: "",
      motherName: "",
      motivoConsulta: "",
      historiaEnfermedadActual: "",
      interrogatorioSistemas: "",
      antecedentesFamiliares: "",
      enfermedadesInfectocontagiosas: "",
      enfermedadesHereditarias: "",
      otrasInfectocontagiosas: "",
      otrasHereditarias: "",
      signosVitalesFc: "",
      signosVitalesFr: "",
      signosVitalesTa: "",
      signosVitalesTemp: "",
      peso: "",
      talla: "",
      areaSuperficieCorporal: "",
      imc: "",
      aspectoGeneral: "",
      pielMucosas: "",
      diagnosticos: "",
      planTratamiento: "",
      presupuesto: "",
      tratamientoRealizado: "",
      chiefComplaint: "",
      diagnosis: "",
      treatment: "",
      toothNumbers: "",
      observations: "",
      nextVisitNotes: "",
    },
  });

  const { data: patientResponse } = useListPatients(debouncedSearch ? { search: debouncedSearch } : undefined);
  const patients = patientResponse?.data ?? [];
  const { data: users } = useListUsers();
  const dentists = users?.filter(u => u.role === "dentist" || u.role === "admin");

  const uploadAttachment = async (recordId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/clinical-records/${recordId}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) throw new Error("No se pudo subir el archivo");
  };

  const onSubmit = (values: FormValues) => {
    const infections = values.enfermedadesInfectocontagiosas ? values.enfermedadesInfectocontagiosas.split(",").map(s => s.trim()).filter(Boolean) : [];
    const hereditarias = values.enfermedadesHereditarias ? values.enfermedadesHereditarias.split(",").map(s => s.trim()).filter(Boolean) : [];
    createRecord.mutate({
      data: {
        ...values,
        patientId: Number(values.patientId),
        dentistId: Number(values.dentistId),
        enfermedadesInfectocontagiosas: infections,
        enfermedadesHereditarias: hereditarias,
      } as never,
    }, {
      onSuccess: async (data) => {
        const id = (data as unknown as { id: number }).id;
        try {
          if (id && radiograficoFile) await uploadAttachment(id, radiograficoFile);
          if (id && fotosFile) await uploadAttachment(id, fotosFile);
          queryClient.invalidateQueries({ queryKey: getListClinicalRecordsQueryKey() });
          toast({ title: "Historia clínica creada exitosamente" });
          setLocation(id ? `/clinical-records/${id}` : "/clinical-records");
        } catch {
          toast({ title: "Historia creada, pero no se pudieron subir todos los archivos", variant: "destructive" });
          setLocation(id ? `/clinical-records/${id}` : "/clinical-records");
        }
      },
      onError: () => toast({ title: "Error", description: "No se pudo crear la historia clínica.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/clinical-records"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Historia Clínica</h1>
          <p className="text-sm text-muted-foreground">Complete todos los campos del formato clínico</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Historia Clínica del Paciente</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar Paciente</label>
                <Input placeholder="Nombre, cédula..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="patientId" render={({ field }) => (
                  <FormItem><FormLabel>Paciente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName} — {p.cedula}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                {me?.role !== "dentist" ? (
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
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="visitDate" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="visitTime" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input placeholder="08:00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="doctorName" render={({ field }) => (<FormItem><FormLabel>Nombre del doctor que examina</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="service" render={({ field }) => (<FormItem><FormLabel>Servicio odontológico</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Edad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="birthPlace" render={({ field }) => (<FormItem><FormLabel>Fecha y lugar de nacimiento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="sex" render={({ field }) => (<FormItem><FormLabel>Sexo</FormLabel><FormControl><Input placeholder="F o M" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="procedence" render={({ field }) => (<FormItem><FormLabel>Procedencia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="escolaridad" render={({ field }) => (<FormItem><FormLabel>Escolaridad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="profession" render={({ field }) => (<FormItem><FormLabel>Profesión u oficio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="addressHabitual" render={({ field }) => (<FormItem><FormLabel>Dirección habitual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="fatherName" render={({ field }) => (<FormItem><FormLabel>Nombre del padre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="motherName" render={({ field }) => (<FormItem><FormLabel>Nombre de la madre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="motivoConsulta" render={({ field }) => (<FormItem><FormLabel>Motivo de consulta</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="historiaEnfermedadActual" render={({ field }) => (<FormItem><FormLabel>Historia de la enfermedad actual</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="interrogatorioSistemas" render={({ field }) => (<FormItem><FormLabel>Interrogatorio por aparatos y sistemas</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="antecedentesFamiliares" render={({ field }) => (<FormItem><FormLabel>Antecedentes familiares patológicos</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="enfermedadesInfectocontagiosas" render={({ field }) => (<FormItem><FormLabel>Enfermedades infecto-contagiosas</FormLabel><FormControl><Input placeholder="Separadas por coma" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="otrasInfectocontagiosas" render={({ field }) => (<FormItem><FormLabel>Otras infecto-contagiosas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="enfermedadesHereditarias" render={({ field }) => (<FormItem><FormLabel>Enfermedades hereditarias</FormLabel><FormControl><Input placeholder="Separadas por coma" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="otrasHereditarias" render={({ field }) => (<FormItem><FormLabel>Otras hereditarias</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="signosVitalesFc" render={({ field }) => (<FormItem><FormLabel>FC</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="signosVitalesFr" render={({ field }) => (<FormItem><FormLabel>FR</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="signosVitalesTa" render={({ field }) => (<FormItem><FormLabel>TA</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="signosVitalesTemp" render={({ field }) => (<FormItem><FormLabel>T°</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="peso" render={({ field }) => (<FormItem><FormLabel>Peso</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="talla" render={({ field }) => (<FormItem><FormLabel>Talla</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="areaSuperficieCorporal" render={({ field }) => (<FormItem><FormLabel>Área superficie corporal</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="imc" render={({ field }) => (<FormItem><FormLabel>IMC</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="aspectoGeneral" render={({ field }) => (<FormItem><FormLabel>Aspecto general</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="pielMucosas" render={({ field }) => (<FormItem><FormLabel>Piel y mucosas</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Examen radiográfico</label>
                <Input type="file" accept="image/*,.pdf" onChange={e => setRadiograficoFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fotos</label>
                <Input type="file" accept="image/*,.pdf" onChange={e => setFotosFile(e.target.files?.[0] ?? null)} />
              </div>
              <FormField control={form.control} name="diagnosticos" render={({ field }) => (<FormItem><FormLabel>Diagnósticos o problemas odontológicos</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="planTratamiento" render={({ field }) => (<FormItem><FormLabel>Plan de tratamiento odontológico</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="presupuesto" render={({ field }) => (<FormItem><FormLabel>Presupuesto</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tratamientoRealizado" render={({ field }) => (<FormItem><FormLabel>Tratamiento realizado</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>)} />
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="text-base">Resumen clínico</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="chiefComplaint" render={({ field }) => (<FormItem><FormLabel>Motivo resumido</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="diagnosis" render={({ field }) => (<FormItem><FormLabel>Diagnóstico *</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="treatment" render={({ field }) => (<FormItem><FormLabel>Tratamiento *</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="toothNumbers" render={({ field }) => (<FormItem><FormLabel>Piezas dentales (FDI)</FormLabel><FormControl><Input placeholder="Ej: 11, 21, 36, 46" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="observations" render={({ field }) => (<FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="nextVisitNotes" render={({ field }) => (<FormItem><FormLabel>Próxima visita</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </CardContent>
              </Card>
              <div className="flex justify-end gap-3 pt-2">
                <Link href="/clinical-records"><Button type="button" variant="outline">Cancelar</Button></Link>
                <Button type="submit" disabled={createRecord.isPending}>{createRecord.isPending ? "Guardando..." : "Guardar Historia Clínica"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
