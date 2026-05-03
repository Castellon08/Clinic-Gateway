import { useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Surface = "V" | "L" | "M" | "D" | "O";
export type WholeStatus = "faltante" | "implante" | "corona" | "puente_inicio" | "puente_fin" | "puente_pontico";

export type SurfaceStatus =
  | "sano"
  | "caries"
  | "obturado"
  | "por_realizar"
  | "realizado"
  | "sellante"
  | "fractura";

export type ToothData = {
  surfaces?: Partial<Record<Surface, SurfaceStatus>>;
  whole?: WholeStatus;
};

export type OdontogramData = Record<number, ToothData>;

export interface OdontogramProps {
  value?: string | null;
  onChange?: (value: string) => void;
  readonly?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const SURFACE_COLORS: Record<SurfaceStatus, string> = {
  sano:        "white",
  caries:      "#ef4444",
  obturado:    "#3b82f6",
  por_realizar: "#fbbf24",
  realizado:   "#22c55e",
  sellante:    "#f97316",
  fractura:    "#6b7280",
};

const SURFACE_LABELS: Record<SurfaceStatus, string> = {
  sano:         "Sano",
  caries:       "Caries",
  obturado:     "Obturado (existente)",
  por_realizar: "Por realizar",
  realizado:    "Realizado",
  sellante:     "Sellante",
  fractura:     "Fractura",
};

const WHOLE_COLORS: Record<WholeStatus, string> = {
  faltante:      "#9ca3af",
  implante:      "#8b5cf6",
  corona:        "#f59e0b",
  puente_inicio: "#0ea5e9",
  puente_fin:    "#0ea5e9",
  puente_pontico:"#0ea5e9",
};

const SURFACE_STATUSES: SurfaceStatus[] = ["sano","caries","obturado","por_realizar","realizado","sellante","fractura"];
const WHOLE_STATUSES: WholeStatus[] = ["faltante","implante","corona","puente_inicio","puente_fin","puente_pontico"];

// ─── Serialization ─────────────────────────────────────────────────────────

export function parseOdontogram(value?: string | null): OdontogramData {
  if (!value) return {};
  try {
    return JSON.parse(value) as OdontogramData;
  } catch {
    return {};
  }
}

export function serializeOdontogram(data: OdontogramData): string {
  const cleaned: OdontogramData = {};
  for (const [key, tooth] of Object.entries(data)) {
    const td = tooth as ToothData;
    const hasSurfaces = td.surfaces && Object.values(td.surfaces).some(v => v !== "sano");
    if (hasSurfaces || td.whole) {
      cleaned[Number(key)] = td;
    }
  }
  return JSON.stringify(cleaned);
}

// ─── SVG Tooth ─────────────────────────────────────────────────────────────

const W = 36; // tooth width
const H = 36; // tooth height
const CX = W / 2;
const CY = H / 2;
const INNER = 9; // half-size of inner occlusal square

// The 5 surface polygons within a W×H box
function surfacePolygon(surface: Surface): string {
  const pts: Record<Surface, number[][]> = {
    V: [[0,0],[W,0],[CX+INNER,CY-INNER],[CX-INNER,CY-INNER]],
    L: [[0,H],[W,H],[CX+INNER,CY+INNER],[CX-INNER,CY+INNER]],
    M: [[0,0],[0,H],[CX-INNER,CY+INNER],[CX-INNER,CY-INNER]],
    D: [[W,0],[W,H],[CX+INNER,CY+INNER],[CX+INNER,CY-INNER]],
    O: [[CX-INNER,CY-INNER],[CX+INNER,CY-INNER],[CX+INNER,CY+INNER],[CX-INNER,CY+INNER]],
  };
  return pts[surface].map(([x,y]) => `${x},${y}`).join(" ");
}

type ActiveTool =
  | { kind: "surface"; status: SurfaceStatus; surface: Surface }
  | { kind: "whole"; status: WholeStatus }
  | { kind: "eraser" };

interface ToothSVGProps {
  number: number;
  data?: ToothData;
  position: "upper" | "lower";
  interactive: boolean;
  activeTool: ActiveTool | null;
  onApply: (tooth: number, surface: Surface | null, wholeStatus: WholeStatus | null) => void;
}

function ToothSVG({ number, data, position, interactive, activeTool, onApply }: ToothSVGProps) {
  const whole = data?.whole;
  const surfaces = data?.surfaces ?? {};
  const isMissing = whole === "faltante";
  const isImplant = whole === "implante";
  const isCrown = whole === "corona";

  const handleSurfaceClick = (surface: Surface) => {
    if (!interactive || !activeTool) return;
    if (activeTool.kind === "surface") {
      onApply(number, activeTool.surface, null);
    } else if (activeTool.kind === "whole") {
      onApply(number, null, activeTool.status);
    } else if (activeTool.kind === "eraser") {
      onApply(number, surface, null);
    }
  };

  const handleWholeClick = () => {
    if (!interactive || !activeTool) return;
    if (activeTool.kind === "whole") {
      onApply(number, null, activeTool.status);
    } else if (activeTool.kind === "eraser") {
      onApply(number, null, null);
    }
  };

  const numberY = position === "upper" ? H + 13 : -5;
  const labelAnchor = "middle";

  return (
    <svg
      width={W}
      height={H + 16}
      viewBox={`0 -16 ${W} ${H + 16}`}
      className="flex-shrink-0"
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      {/* Tooth number */}
      <text
        x={CX}
        y={position === "upper" ? H + 10 : -2}
        textAnchor={labelAnchor}
        fontSize="8"
        fontFamily="sans-serif"
        fill="#374151"
        fontWeight="600"
      >
        {number}
      </text>

      {/* Tooth body */}
      <g transform="translate(0, 0)">
        {/* Border rect */}
        <rect x={0} y={0} width={W} height={H} fill="white" stroke="#9ca3af" strokeWidth="1" />

        {isMissing ? (
          // X mark for missing tooth
          <g>
            <rect x={0} y={0} width={W} height={H} fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1" />
            <line x1={4} y1={4} x2={W-4} y2={H-4} stroke="#9ca3af" strokeWidth="2" />
            <line x1={W-4} y1={4} x2={4} y2={H-4} stroke="#9ca3af" strokeWidth="2" />
          </g>
        ) : isImplant ? (
          <g>
            <rect x={0} y={0} width={W} height={H} fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize="14" fill="#7c3aed" fontWeight="bold">⬡</text>
          </g>
        ) : isCrown ? (
          <g>
            {/* Draw surfaces still but tint */}
            {(["V","L","M","D","O"] as Surface[]).map(s => (
              <polygon
                key={s}
                points={surfacePolygon(s)}
                fill={surfaces[s] ? SURFACE_COLORS[surfaces[s]!] : "#fef3c7"}
                stroke="#d97706"
                strokeWidth="0.5"
                onClick={() => handleSurfaceClick(s)}
              />
            ))}
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="bold">C</text>
          </g>
        ) : (
          // Normal tooth with 5 surfaces
          (["V","L","M","D","O"] as Surface[]).map(s => (
            <polygon
              key={s}
              points={surfacePolygon(s)}
              fill={surfaces[s] ? SURFACE_COLORS[surfaces[s]!] : "white"}
              stroke="#9ca3af"
              strokeWidth="0.5"
              onClick={() => handleSurfaceClick(s)}
            />
          ))
        )}

        {/* Outer border on top */}
        <rect x={0} y={0} width={W} height={H} fill="none" stroke="#6b7280" strokeWidth="1" />
      </g>

      {/* Whole-tooth click area overlay (for faltante / implante / crown selection) */}
      {interactive && activeTool?.kind === "whole" && (
        <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={handleWholeClick} />
      )}
      {interactive && activeTool?.kind === "eraser" && (
        <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={handleWholeClick} />
      )}
    </svg>
  );
}

// ─── Arch Row ───────────────────────────────────────────────────────────────

function ArchRow({
  teeth,
  position,
  data,
  interactive,
  activeTool,
  onApply,
}: {
  teeth: number[];
  position: "upper" | "lower";
  data: OdontogramData;
  interactive: boolean;
  activeTool: ActiveTool | null;
  onApply: (tooth: number, surface: Surface | null, whole: WholeStatus | null) => void;
}) {
  return (
    <div className="flex gap-0.5 justify-center items-end">
      {teeth.map(n => (
        <ToothSVG
          key={n}
          number={n}
          data={data[n]}
          position={position}
          interactive={interactive}
          activeTool={activeTool}
          onApply={onApply}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Odontogram({ value, onChange, readonly = false }: OdontogramProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(
    readonly ? null : { kind: "surface", status: "caries", surface: "O" }
  );

  const data = parseOdontogram(value);

  const handleApply = useCallback((tooth: number, surface: Surface | null, wholeStatus: WholeStatus | null) => {
    if (readonly || !onChange) return;
    const current = data[tooth] ?? {};

    let updated: ToothData;

    if (wholeStatus !== null) {
      // Set or clear whole-tooth status
      if (current.whole === wholeStatus) {
        updated = { ...current, whole: undefined };
      } else {
        updated = { ...current, whole: wholeStatus };
      }
    } else if (surface !== null && activeTool?.kind === "surface") {
      // Set surface status
      const newStatus = activeTool.status;
      const prevStatus = current.surfaces?.[surface] ?? "sano";
      const nextStatus: SurfaceStatus = prevStatus === newStatus ? "sano" : newStatus;
      updated = {
        ...current,
        surfaces: { ...current.surfaces, [surface]: nextStatus },
      };
    } else if (surface !== null && activeTool?.kind === "eraser") {
      // Clear surface
      const newSurfaces = { ...current.surfaces };
      delete newSurfaces[surface];
      updated = { ...current, surfaces: newSurfaces };
    } else if (surface === null && activeTool?.kind === "eraser") {
      // Clear whole tooth
      updated = {};
    } else {
      return;
    }

    const newData = { ...data, [tooth]: updated };
    onChange(serializeOdontogram(newData));
  }, [data, activeTool, readonly, onChange]);

  const handleToolSelect = (tool: ActiveTool) => {
    setActiveTool(prev => {
      if (prev?.kind === tool.kind) {
        if (tool.kind === "eraser") return null;
        if (tool.kind === "surface" && prev.kind === "surface" && prev.status === tool.status && prev.surface === tool.surface) return null;
        if (tool.kind === "whole" && prev.kind === "whole" && prev.status === tool.status) return null;
      }
      return tool;
    });
  };

  const isToolActive = (tool: ActiveTool): boolean => {
    if (!activeTool) return false;
    if (activeTool.kind !== tool.kind) return false;
    if (tool.kind === "surface" && activeTool.kind === "surface") {
      return activeTool.status === tool.status && activeTool.surface === tool.surface;
    }
    if (tool.kind === "whole" && activeTool.kind === "whole") {
      return activeTool.status === tool.status;
    }
    return activeTool.kind === "eraser";
  };

  // Count affected teeth for summary
  const affected = Object.entries(data).filter(([, td]) => {
    const t = td as ToothData;
    return t.whole || (t.surfaces && Object.values(t.surfaces).some(v => v !== "sano"));
  });

  return (
    <div className="space-y-4 select-none">

      {!readonly && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          {/* Surface tool palette */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Superficie activa</p>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {(["O","V","L","M","D"] as Surface[]).map(s => {
                const labels: Record<Surface,string> = { O:"Oclusal", V:"Vest.", L:"Ling.", M:"Mes.", D:"Dist." };
                const active = activeTool?.kind === "surface" && activeTool.surface === s && activeTool.status === (activeTool as { status: SurfaceStatus }).status;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`text-xs py-1 rounded border font-medium transition-colors ${active ? "ring-2 ring-primary" : ""}`}
                    style={{ borderColor: "#9ca3af", background: "white" }}
                    onClick={() => {
                      const status = activeTool?.kind === "surface" ? activeTool.status : "caries";
                      handleToolSelect({ kind: "surface", status, surface: s });
                    }}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SURFACE_STATUSES.filter(s => s !== "sano").map(status => {
                const surfaceChoice = activeTool?.kind === "surface" ? activeTool.surface : "O";
                const tool: ActiveTool = { kind: "surface", status, surface: surfaceChoice };
                const active = isToolActive(tool);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleToolSelect(tool)}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${active ? "ring-2 ring-offset-1 ring-gray-600 font-bold" : "hover:opacity-80"}`}
                    style={{ background: SURFACE_COLORS[status], borderColor: SURFACE_COLORS[status], color: "white" }}
                  >
                    {SURFACE_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Whole-tooth tools */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Diente completo</p>
            <div className="flex flex-wrap gap-1.5">
              {(["faltante","implante","corona"] as WholeStatus[]).map(status => {
                const tool: ActiveTool = { kind: "whole", status };
                const active = isToolActive(tool);
                const wholeLabels: Partial<Record<WholeStatus,string>> = {
                  faltante: "Faltante / Extraído",
                  implante: "Implante",
                  corona: "Corona",
                };
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleToolSelect(tool)}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${active ? "ring-2 ring-offset-1 ring-gray-600 font-bold" : "hover:opacity-80"}`}
                    style={{ background: WHOLE_COLORS[status], borderColor: WHOLE_COLORS[status], color: "white" }}
                  >
                    {wholeLabels[status]}
                  </button>
                );
              })}
              {/* Eraser */}
              <button
                type="button"
                onClick={() => handleToolSelect({ kind: "eraser" })}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${isToolActive({ kind: "eraser" }) ? "ring-2 ring-offset-1 ring-gray-600 font-bold bg-gray-200 border-gray-400" : "bg-white border-gray-400 hover:bg-gray-100"}`}
              >
                ✕ Borrar
              </button>
            </div>
          </div>

          {/* Active tool indicator */}
          {activeTool && (
            <div className="text-xs text-muted-foreground">
              {activeTool.kind === "surface" && (
                <span>
                  Herramienta: <strong>{SURFACE_LABELS[activeTool.status]}</strong> en superficie <strong>
                    {activeTool.surface === "O" ? "Oclusal" : activeTool.surface === "V" ? "Vestibular" : activeTool.surface === "L" ? "Lingual" : activeTool.surface === "M" ? "Mesial" : "Distal"}
                  </strong>
                </span>
              )}
              {activeTool.kind === "whole" && (
                <span>
                  Herramienta: <strong>
                    {activeTool.status === "faltante" ? "Diente faltante" : activeTool.status === "implante" ? "Implante" : "Corona"}
                  </strong> — haz clic en el diente
                </span>
              )}
              {activeTool.kind === "eraser" && <span>Herramienta: <strong>Borrador</strong></span>}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="border border-border rounded-lg p-3 bg-white overflow-x-auto">
        <div className="min-w-max space-y-1">

          {/* Upper jaw label */}
          <div className="text-center text-xs text-muted-foreground font-semibold mb-0.5">— SUPERIOR —</div>

          {/* Upper row */}
          <div className="flex justify-center gap-3">
            <div className="flex flex-col items-end">
              <div className="text-[9px] text-muted-foreground text-center w-full mb-0.5">Derecho</div>
              <ArchRow teeth={UPPER_RIGHT} position="upper" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} />
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col items-start">
              <div className="text-[9px] text-muted-foreground text-center w-full mb-0.5">Izquierdo</div>
              <ArchRow teeth={UPPER_LEFT} position="upper" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} />
            </div>
          </div>

          {/* Midline */}
          <div className="border-t-2 border-dashed border-gray-300 my-2" />

          {/* Lower row */}
          <div className="flex justify-center gap-3">
            <div className="flex flex-col items-end">
              <ArchRow teeth={LOWER_RIGHT} position="lower" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} />
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col items-start">
              <ArchRow teeth={LOWER_LEFT} position="lower" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} />
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground font-semibold mt-0.5">— INFERIOR —</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {SURFACE_STATUSES.filter(s => s !== "sano").map(s => (
          <span key={s} className="flex items-center gap-1 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ background: SURFACE_COLORS[s] }} />
            {SURFACE_LABELS[s]}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: WHOLE_COLORS.faltante }} />
          Faltante
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: WHOLE_COLORS.implante }} />
          Implante
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: WHOLE_COLORS.corona }} />
          Corona
        </span>
      </div>

      {/* Summary */}
      {affected.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Piezas registradas:</p>
          <div className="flex flex-wrap gap-1.5">
            {affected.sort(([a],[b]) => Number(a)-Number(b)).map(([tooth, td]) => {
              const t = td as ToothData;
              const labels: string[] = [];
              if (t.whole) {
                const wl: Partial<Record<WholeStatus,string>> = { faltante:"Faltante", implante:"Implante", corona:"Corona", puente_inicio:"Puente inicio", puente_fin:"Puente fin", puente_pontico:"Pontico" };
                labels.push(wl[t.whole] ?? t.whole);
              }
              if (t.surfaces) {
                for (const [s, st] of Object.entries(t.surfaces)) {
                  if (st && st !== "sano") {
                    const sl: Record<Surface,string> = { O:"Ocl", V:"Vest", L:"Ling", M:"Mes", D:"Dist" };
                    labels.push(`${sl[s as Surface]}:${SURFACE_LABELS[st]}`);
                  }
                }
              }
              return (
                <span key={tooth} className="text-xs px-2 py-0.5 bg-muted rounded border border-border font-mono">
                  {tooth}: {labels.join(", ")}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
