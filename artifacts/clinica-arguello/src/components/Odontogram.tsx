import { useState } from "react";

export type ToothStatus = "healthy" | "caries" | "filled" | "missing" | "crown" | "extracted" | "root_canal" | "implant" | "bridge";

export interface ToothData {
  status: ToothStatus;
  notes?: string;
}

export type OdontogramData = Record<string, ToothData>;

interface OdontogramProps {
  data: OdontogramData;
  onChange?: (data: OdontogramData) => void;
  readonly?: boolean;
}

const STATUS_CONFIG: Record<ToothStatus, { label: string; color: string; bg: string }> = {
  healthy:    { label: "Sano",         color: "#22c55e", bg: "#f0fdf4" },
  caries:     { label: "Caries",       color: "#ef4444", bg: "#fef2f2" },
  filled:     { label: "Obturado",     color: "#3b82f6", bg: "#eff6ff" },
  missing:    { label: "Ausente",      color: "#9ca3af", bg: "#f9fafb" },
  crown:      { label: "Corona",       color: "#f59e0b", bg: "#fffbeb" },
  extracted:  { label: "Extraído",     color: "#6b7280", bg: "#f3f4f6" },
  root_canal: { label: "Endodoncia",   color: "#8b5cf6", bg: "#f5f3ff" },
  implant:    { label: "Implante",     color: "#06b6d4", bg: "#ecfeff" },
  bridge:     { label: "Puente",       color: "#f97316", bg: "#fff7ed" },
};

const ALL_STATUSES: ToothStatus[] = ["healthy", "caries", "filled", "missing", "crown", "extracted", "root_canal", "implant", "bridge"];

// FDI numbering system
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

function ToothSVG({ number, data, onClick }: { number: number; data?: ToothData; onClick?: () => void }) {
  const status = data?.status ?? "healthy";
  const config = STATUS_CONFIG[status];
  const isMissing = status === "missing" || status === "extracted";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 group"
      title={`Pieza ${number} — ${config.label}${data?.notes ? `: ${data.notes}` : ""}`}
    >
      <span className="text-[9px] text-muted-foreground font-mono">{number}</span>
      <svg width="28" height="32" viewBox="0 0 28 32" className={`transition-all ${onClick ? "cursor-pointer group-hover:scale-110" : ""}`}>
        {/* Tooth shape */}
        {isMissing ? (
          <rect x="4" y="4" width="20" height="24" rx="4" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="3,2" />
        ) : (
          <>
            <rect x="4" y="4" width="20" height="24" rx="4" fill={config.bg} stroke={config.color} strokeWidth="1.5" />
            {/* Crown indicator for crown/bridge */}
            {(status === "crown" || status === "bridge") && (
              <rect x="6" y="6" width="16" height="8" rx="2" fill={config.color} opacity="0.4" />
            )}
            {/* Root canal indicator */}
            {status === "root_canal" && (
              <line x1="14" y1="10" x2="14" y2="26" stroke={config.color} strokeWidth="2" strokeLinecap="round" />
            )}
            {/* Caries dot */}
            {status === "caries" && (
              <circle cx="14" cy="16" r="4" fill={config.color} opacity="0.7" />
            )}
            {/* Filled cross */}
            {status === "filled" && (
              <rect x="9" y="12" width="10" height="8" rx="1" fill={config.color} opacity="0.5" />
            )}
            {/* Implant indicator */}
            {status === "implant" && (
              <line x1="14" y1="6" x2="14" y2="28" stroke={config.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2,2" />
            )}
          </>
        )}
      </svg>
    </button>
  );
}

function ToothRow({ teeth, data, onClick }: { teeth: number[]; data: OdontogramData; onClick?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {teeth.map(n => (
        <ToothSVG
          key={n}
          number={n}
          data={data[String(n)]}
          onClick={onClick ? () => onClick(n) : undefined}
        />
      ))}
    </div>
  );
}

export function Odontogram({ data, onChange, readonly = false }: OdontogramProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ToothStatus>("caries");
  const [noteText, setNoteText] = useState("");

  function handleToothClick(n: number) {
    if (readonly) return;
    setSelected(n);
    const existing = data[String(n)];
    if (existing) {
      setSelectedStatus(existing.status);
      setNoteText(existing.notes ?? "");
    } else {
      setSelectedStatus("caries");
      setNoteText("");
    }
  }

  function applyStatus() {
    if (!selected || !onChange) return;
    const newData = {
      ...data,
      [String(selected)]: { status: selectedStatus, notes: noteText.trim() || undefined },
    };
    onChange(newData);
    setSelected(null);
  }

  function clearTooth() {
    if (!selected || !onChange) return;
    const newData = { ...data };
    delete newData[String(selected)];
    onChange(newData);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(s => (
          <span key={s} className="flex items-center gap-1 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: STATUS_CONFIG[s].bg, borderColor: STATUS_CONFIG[s].color }} />
            {STATUS_CONFIG[s].label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="space-y-1">
          {/* Upper jaw */}
          <div className="text-center text-xs text-muted-foreground mb-1 font-medium">Superior</div>
          <div className="flex justify-center gap-3">
            <div>
              <div className="text-[9px] text-center text-muted-foreground mb-0.5">Derecho</div>
              <ToothRow teeth={UPPER_RIGHT} data={data} onClick={readonly ? undefined : handleToothClick} />
            </div>
            <div className="w-px bg-border self-stretch" />
            <div>
              <div className="text-[9px] text-center text-muted-foreground mb-0.5">Izquierdo</div>
              <ToothRow teeth={UPPER_LEFT} data={data} onClick={readonly ? undefined : handleToothClick} />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-border my-2" />

          {/* Lower jaw */}
          <div className="flex justify-center gap-3">
            <div>
              <ToothRow teeth={LOWER_RIGHT} data={data} onClick={readonly ? undefined : handleToothClick} />
            </div>
            <div className="w-px bg-border self-stretch" />
            <div>
              <ToothRow teeth={LOWER_LEFT} data={data} onClick={readonly ? undefined : handleToothClick} />
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-1 font-medium">Inferior</div>
        </div>
      </div>

      {/* Tooth editor panel */}
      {selected && !readonly && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Pieza {selected}</p>
            <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs">Cerrar</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ALL_STATUSES.map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`text-xs py-1.5 px-2 rounded border text-left transition-colors ${
                  selectedStatus === s ? "ring-2 ring-offset-1" : "hover:bg-muted"
                }`}
                style={selectedStatus === s ? { borderColor: STATUS_CONFIG[s].color, backgroundColor: STATUS_CONFIG[s].bg, ringColor: STATUS_CONFIG[s].color } : {}}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Notas</label>
            <input
              type="text"
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
              placeholder="Observaciones de la pieza..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyStatus}
              className="flex-1 bg-primary text-primary-foreground text-sm py-1.5 rounded hover:bg-primary/90 transition-colors font-medium"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={clearTooth}
              className="text-sm py-1.5 px-3 rounded border border-border hover:bg-muted transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Summary of affected teeth */}
      {Object.keys(data).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Piezas con registro:</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data).sort(([a],[b]) => Number(a)-Number(b)).map(([tooth, d]) => (
              <span key={tooth} className="text-xs px-1.5 py-0.5 rounded border" style={{ backgroundColor: STATUS_CONFIG[d.status].bg, borderColor: STATUS_CONFIG[d.status].color, color: STATUS_CONFIG[d.status].color }}>
                {tooth} — {STATUS_CONFIG[d.status].label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
