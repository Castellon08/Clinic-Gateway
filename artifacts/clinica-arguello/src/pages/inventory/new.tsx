import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateInventoryItem, getListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  category: z.string().optional(),
  unit: z.string().min(1, "Unidad requerida"),
  quantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  unitCost: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewInventoryItemPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createItem = useCreateInventoryItem();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "", unit: "", quantity: 0, minQuantity: 5, unitCost: undefined, supplier: "" },
  });

  const onSubmit = (values: FormValues) => {
    createItem.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        toast({ title: "Artículo agregado al inventario" });
        setLocation("/inventory");
      },
      onError: () => toast({ title: "Error al agregar artículo", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/inventory"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Artículo</h1>
          <p className="text-sm text-muted-foreground">Agregar artículo al inventario</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Datos del artículo</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Guantes de látex talla M" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input placeholder="Protección personal" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel>Unidad *</FormLabel><FormControl><Input placeholder="caja, unidad, frasco..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Cantidad inicial</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="minQuantity" render={({ field }) => (
                  <FormItem><FormLabel>Cantidad mínima</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unitCost" render={({ field }) => (
                  <FormItem><FormLabel>Costo unitario</FormLabel><FormControl><Input type="number" min={0} step={0.01} placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="supplier" render={({ field }) => (
                <FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Distribuidora Médica..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-3 pt-2">
                <Link href="/inventory"><Button type="button" variant="outline">Cancelar</Button></Link>
                <Button type="submit" disabled={createItem.isPending}>
                  {createItem.isPending ? "Guardando..." : "Agregar Artículo"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
