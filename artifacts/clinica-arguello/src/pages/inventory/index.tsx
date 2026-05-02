import { useState } from "react";
import { Link } from "wouter";
import { useListInventory, useAdjustInventory, getListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, PackagePlus, PackageMinus, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface InventoryItem {
  id: number;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: number | null;
  supplier: string | null;
  isLowStock: boolean;
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustQty, setAdjustQty] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const adjustInventory = useAdjustInventory();

  const params: Record<string, unknown> = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (showLowStock) params.lowStock = "true";

  const { data: items, isLoading } = useListInventory(params);

  function handleAdjust() {
    if (!adjustItem || adjustQty <= 0) return;
    adjustInventory.mutate({ id: adjustItem.id, data: { type: adjustType, quantity: adjustQty } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        toast({ title: `Inventario ${adjustType === "in" ? "aumentado" : "reducido"}: ${adjustItem.name}` });
        setAdjustItem(null);
        setAdjustQty(1);
      },
      onError: () => toast({ title: "Error al ajustar inventario", variant: "destructive" }),
    });
  }

  const lowStockCount = items?.filter(i => i.isLowStock).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Control de materiales y suministros</p>
        </div>
        <Link href="/inventory/new">
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo Artículo</Button>
        </Link>
      </div>

      {lowStockCount > 0 && !showLowStock && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">{lowStockCount} artículo{lowStockCount !== 1 ? "s" : ""} con stock bajo</span>
          </div>
          <Button variant="ghost" size="sm" className="text-amber-700 h-7" onClick={() => setShowLowStock(true)}>Ver</Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar artículo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button
          variant={showLowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setShowLowStock(v => !v)}
        >
          {showLowStock ? "Ver todos" : "Stock bajo"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-16"/>)}</div>
      ) : !items?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No hay artículos en inventario</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-lg border bg-card ${item.isLowStock ? "border-amber-300 bg-amber-50/60" : "border-border"}`}
            >
              <div className="flex items-center gap-3">
                {item.isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category && `${item.category} · `}{item.unit}
                    {item.supplier && ` · ${item.supplier}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-bold text-lg ${item.isLowStock ? "text-amber-700" : "text-foreground"}`}>
                    {item.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">mín: {item.minQuantity} {item.unit}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Entrada"
                    onClick={() => { setAdjustItem(item as InventoryItem); setAdjustType("in"); setAdjustQty(1); }}>
                    <PackagePlus className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Salida"
                    onClick={() => { setAdjustItem(item as InventoryItem); setAdjustType("out"); setAdjustQty(1); }}>
                    <PackageMinus className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust dialog */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{adjustType === "in" ? "Entrada de Inventario" : "Salida de Inventario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">{adjustItem?.name}</p>
            <p className="text-sm text-muted-foreground">Stock actual: {adjustItem?.quantity} {adjustItem?.unit}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de movimiento</label>
              <Select value={adjustType} onValueChange={(v: "in" | "out") => setAdjustType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada (agregar)</SelectItem>
                  <SelectItem value="out">Salida (retirar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad</label>
              <Input type="number" min={1} value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={adjustInventory.isPending}>
              {adjustInventory.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
