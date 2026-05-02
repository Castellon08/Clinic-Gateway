import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices, useUpdateInvoice, getListInvoicesQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, CheckCircle, Percent } from "lucide-react";

const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", paid: "Pagada", cancelled: "Cancelada" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(Number(amount));
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-NI", { year: "numeric", month: "short", day: "numeric" });
}

function calcReduction(base: number, total: number) {
  if (!base) return { amount: 0, percent: 0 };
  const amount = Math.max(0, base - total);
  const percent = (amount / base) * 100;
  return { amount, percent };
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateInvoice = useUpdateInvoice();
  const { data: me } = useGetMe();

  const { data: invoices, isLoading } = useListInvoices(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "paid" | "cancelled" } : undefined
  );

  function markAsPaid(id: number) {
    updateInvoice.mutate({ id, data: { status: "paid" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Factura marcada como pagada" });
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  }

  const totalPending = invoices?.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de facturas e ingresos</p>
        </div>
        {me?.role === "admin" && (
          <Link href="/invoices/new">
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Factura</Button>
          </Link>
        )}
      </div>

      {statusFilter === "all" && totalPending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Facturas pendientes de cobro</p>
            <p className="text-xs text-yellow-700 mt-0.5">Total: {formatCurrency(totalPending)}</p>
          </div>
        </div>
      )}

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendientes</SelectItem>
          <SelectItem value="paid">Pagadas</SelectItem>
          <SelectItem value="cancelled">Canceladas</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !invoices?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No hay facturas</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const items = invoice.items ?? [];
            const baseTotal = items.reduce((s, item) => s + Number(item.quantity) * Number(item.unitPrice), 0);
            const total = Number(invoice.total);
            const reduction = calcReduction(baseTotal, total);
            return (
              <Card key={invoice.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[invoice.status]}`}>
                            {STATUS_LABELS[invoice.status]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {invoice.patient?.firstName} {invoice.patient?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Emitida: {formatDate(invoice.createdAt)}
                          {invoice.paidAt && ` · Pagada: ${formatDate(invoice.paidAt)}`}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-1"><Percent className="h-3 w-3" /> Reducción aplicada: {reduction.percent.toFixed(2)}%</p>
                          <p>Subtotal antes de reducción: {formatCurrency(baseTotal)}</p>
                          <p>Total con reducción: {formatCurrency(total)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-foreground">{formatCurrency(invoice.total)}</span>
                      {invoice.status === "pending" && me?.role === "admin" && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(invoice.id)} disabled={updateInvoice.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" />Marcar Pagada
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
