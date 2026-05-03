import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export type ToothStatus = "existente" | "por_realizar" | "realizado" | "faltante" | "corrector" | "implante";

export interface OdontogramProps {
  value?: string | null;
  onChange?: (value: string) => void;
  readonly?: boolean;
}

const statuses: ToothStatus[] = ["existente", "por_realizar", "realizado", "faltante", "corrector", "implante"];

const statusClasses: Record<ToothStatus, string> = {
  existente: "bg-slate-100 border-slate-300 text-slate-900",
  por_realizar: "bg-amber-100 border-amber-300 text-amber-900",
  realizado: "bg-emerald-100 border-emerald-300 text-emerald-900",
  faltante: "bg-rose-100 border-rose-300 text-rose-900 line-through",
  corrector: "bg-blue-100 border-blue-300 text-blue-900",
  implante: "bg-violet-100 border-violet-300 text-violet-900",
};

const labels: Record<ToothStatus, string> = {
  existente: "Existente",
  por_realizar: "Por realizar",
  realizado: "Realizado",
  faltante: "Faltante",
  corrector: "Corrector",
  implante: "Implante",
};

const teeth = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

function parseValue(value?: string | null) {
  const map = new Map<number, ToothStatus>();
  (value ?? "").split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const [tooth, status] = item.split(":").map((s) => s.trim());
    const num = Number(tooth);
    if (!Number.isFinite(num)) return;
    if ((statuses as string[]).includes(status)) map.set(num, status as ToothStatus);
  });
  return map;
}

function serializeValue(map: Map<number, ToothStatus>) {
  return [...map.entries()]
    .filter(([, status]) => status !== "existente")
    .map(([tooth, status]) => `${tooth}:${status}`)
    .join(", ");
}

export function Odontogram({ value, onChange, readonly }: OdontogramProps) {
  const toothMap = useMemo(() => parseValue(value), [value]);

  const toggle = (tooth: number) => {
    const current = toothMap.get(tooth) ?? "existente";
    const nextStatus = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    const next = new Map(toothMap);
    next.set(tooth, nextStatus);
    onChange?.(serializeValue(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <span key={status} className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[status]}`}>
            {labels[status]}
          </span>
        ))}
      </div>
      <div className="grid gap-3">
        <div className="grid grid-cols-8 gap-2">
          {teeth.slice(0, 16).map((tooth) => (
            <Button key={tooth} type="button" variant="outline" className={`h-10 text-xs font-semibold border-2 ${statusClasses[toothMap.get(tooth) ?? "existente"]}`} onClick={() => !readonly && toggle(tooth)} disabled={readonly}>
              {tooth}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-2">
          {teeth.slice(16).map((tooth) => (
            <Button key={tooth} type="button" variant="outline" className={`h-10 text-xs font-semibold border-2 ${statusClasses[toothMap.get(tooth) ?? "existente"]}`} onClick={() => !readonly && toggle(tooth)} disabled={readonly}>
              {tooth}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}