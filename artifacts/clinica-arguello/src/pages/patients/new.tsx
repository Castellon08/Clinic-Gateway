import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePatient, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const patientSchema = z.object({
  cedula: z.string().min(1, "Cédula requerida"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  birthDate: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof patientSchema>;

export default function NewPatientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPatient = useCreatePatient();

  const form = useForm<FormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { cedula: "", firstName: "", lastName: "", phone: "", email: "", address: "", bloodType: "", allergies: "", medicalNotes: "" },
  });

  const onSubmit = (values: FormValues) => {
    createPatient.mutate({ data: values }, {
      onSuccess: (patient) => {
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        toast({ title: "Paciente registrado", description: `${patient.firstName} ${patient.lastName} fue registrado exitosamente.` });
        setLocation(`/patients/${patient.id}`);
      },
      onError: () => toast({ title: "Error", description: "No se pudo registrar el paciente.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/patients">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Paciente</h1>
          <p className="text-sm text-muted-foreground">Complete los datos del paciente</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Datos Personales</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="cedula" render={({ field }) => (
                  <FormItem><FormLabel>Cédula *</FormLabel><FormControl><Input placeholder="001-000000-0001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="female">Femenino</SelectItem>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input placeholder="Martínez" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="birthDate" render={({ field }) => (
                  <FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bloodType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de Sangre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="8888-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Correo electrónico</FormLabel><FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Barrio El Laborío, León" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="allergies" render={({ field }) => (
                <FormItem><FormLabel>Alergias</FormLabel><FormControl><Input placeholder="Penicilina, Ibuprofeno..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="medicalNotes" render={({ field }) => (
                <FormItem><FormLabel>Notas médicas</FormLabel><FormControl><Textarea rows={3} placeholder="Condiciones preexistentes, observaciones..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/patients"><Button type="button" variant="outline">Cancelar</Button></Link>
                <Button type="submit" disabled={createPatient.isPending}>
                  {createPatient.isPending ? "Guardando..." : "Registrar Paciente"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
