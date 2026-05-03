import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useListPatients, useCreateInvoice, useGetMe, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unitPriceUsd?: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(amount);
}

export default function NewInvoicePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const { data: me } = useGetMe();
  const isAdmin = me?.role === "admin";

  const [patientSearch, setPatientSearch] = useState("");
  const debouncedSearch = useDebounce(patientSearch, 300);
  const [patientId, setPatientId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [markupPercent, setMarkupPercent] = useState<string>("0");
  const [exchangeRate, setExchangeRate] = useState<string>("0");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, unitPriceUsd: 0 }]);

  const { data: patientResponse } = useListPatients(debouncedSearch ? { search: debouncedSearch } : undefined);
  const patients = patientResponse?.data ?? [];

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, unitPriceUsd: 0 }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  const markupPercentValue = Number(markupPercent) || 0;
  const exchangeRateValue = Number(exchangeRate) || 0;
  const baseSubtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const baseSubtotalUsd = exchangeRateValue > 0 ? baseSubtotal / exchangeRateValue : 0;
  const total = baseSubtotal + baseSubtotal * (markupPercentValue / 100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { toast({ title: "Seleccione un paciente", variant: "destructive" }); return; }
    if (items.some((i) => !i.description || i.unitPrice <= 0)) { toast({ title: "Complete todos los artículos", variant: "destructive" }); return; }
    createInvoice.mutate({
      data: { patientId: Number(patientId), items, paymentMethod: paymentMethod ? (paymentMethod as never) : undefined }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Factura creada exitosamente" });
        setLocation("/invoices");
      },
      onError: () => toast({ title: "Error al crear factura", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Factura</h1>
          <p className="text-sm text-muted-foreground">Crear una nueva factura de servicios</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Datos del Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Paciente</label>
              <Input placeholder="Nombre, cédula..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente *</label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de pago</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porcentaje para la clínica (%)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de cambio (USD → C$)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Artículos / Servicios</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                  <Input placeholder="Limpieza dental..." value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                </div>
                <div className="w-20">
                  <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                  <Input type="text" inputMode="decimal" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                </div>
                <div className="w-28">
                  <label className="text-xs text-muted-foreground mb-1 block">Precio unit.</label>
                  <Input type="text" inputMode="decimal" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
                </div>
                {isAdmin && (
                  <div className="w-28">
                    <label className="text-xs text-muted-foreground mb-1 block">Precio en dólar</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.unitPriceUsd ?? ""}
                      onChange={(e) => updateItem(idx, "unitPriceUsd", Number(e.target.value))}
                    />
                  </div>
                )}
                <div className="w-24 text-right pb-2">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                </div>
                {items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive mb-0.5"><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-1 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(baseSubtotal)}</p>
                <p className="text-sm text-muted-foreground">Reducción / porcentaje: {markupPercentValue.toFixed(2)}%</p>
                <p className="text-xl font-bold text-foreground">Total con reducción: {formatCurrency(total)}</p>
                {isAdmin && exchangeRateValue > 0 && (
                  <p className="text-sm text-muted-foreground">Subtotal en dólar: ${baseSubtotalUsd.toFixed(2)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/invoices"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={createInvoice.isPending}>{createInvoice.isPending ? "Creando..." : "Crear Factura"}</Button>
        </div>
      </form>
    </div>
  );
}
