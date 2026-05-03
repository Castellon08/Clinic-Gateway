import { useState, useCallback, useId } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Surface = "V" | "L" | "M" | "D" | "O";
export type WholeStatus = "faltante" | "implante" | "corona";

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
  sano:         "#ffffff",
  caries:       "#ef4444",
  obturado:     "#3b82f6",
  por_realizar: "#fbbf24",
  realizado:    "#22c55e",
  sellante:     "#f97316",
  fractura:     "#6b7280",
};

const SURFACE_LABELS: Record<SurfaceStatus, string> = {
  sano:         "Sano",
  caries:       "Caries",
  obturado:     "Obturado",
  por_realizar: "Por realizar",
  realizado:    "Realizado",
  sellante:     "Sellante",
  fractura:     "Fractura",
};

const WHOLE_COLORS: Record<WholeStatus, string> = {
  faltante: "#9ca3af",
  implante: "#8b5cf6",
  corona:   "#f59e0b",
};

const SURFACE_STATUSES = (Object.keys(SURFACE_COLORS) as SurfaceStatus[]).filter(s => s !== "sano");
const WHOLE_STATUSES: WholeStatus[] = ["faltante", "implante", "corona"];

// ─── Serialization ─────────────────────────────────────────────────────────

export function parseOdontogram(value?: string | null): OdontogramData {
  if (!value) return {};
  try { return JSON.parse(value) as OdontogramData; } catch { return {}; }
}

export function serializeOdontogram(data: OdontogramData): string {
  const cleaned: OdontogramData = {};
  for (const [key, tooth] of Object.entries(data)) {
    const td = tooth as ToothData;
    const hasSurfaces = td.surfaces && Object.values(td.surfaces).some(v => v && v !== "sano");
    if (hasSurfaces || td.whole) cleaned[Number(key)] = td;
  }
  return JSON.stringify(cleaned);
}

// ─── Tooth type detection ───────────────────────────────────────────────────

type ToothType = "incisor" | "canine" | "premolar" | "molar";

function getToothType(n: number): ToothType {
  const d = n % 10;
  if (d === 1 || d === 2) return "incisor";
  if (d === 3) return "canine";
  if (d === 4 || d === 5) return "premolar";
  return "molar";
}

// ─── Tooth SVG Illustrations ────────────────────────────────────────────────
// ViewBox: 0 0 40 62, upper orientation (crown at top, root at bottom)
// For lower teeth, we apply transform="scale(1,-1) translate(0,-62)" to flip

const TOOTH_PATHS: Record<ToothType, { crown: string; roots: string }> = {
  incisor: {
    crown: "M 11,2 C 14,0 26,0 29,2 L 30,19 C 25,22 15,22 10,19 Z",
    roots: "M 15,21 L 25,21 C 26,32 25,47 20,55 C 15,47 14,32 15,21 Z",
  },
  canine: {
    crown: "M 10,9 C 13,3 17,0 20,0 C 23,0 27,3 30,9 L 28,20 C 24,22 16,22 12,20 Z",
    roots: "M 14,21 L 26,21 C 27,34 25,50 20,58 C 15,50 13,34 14,21 Z",
  },
  premolar: {
    crown: "M 9,4 C 12,0 16,0 17,4 C 17,8 19,10 20,10 C 21,10 23,8 23,4 C 24,0 28,0 31,4 L 32,19 C 26,22 14,22 8,19 Z",
    roots: "M 12,21 L 17,21 C 17,36 16,50 14,56 C 12,50 11,36 12,21 Z M 23,21 L 28,21 C 28,36 27,50 25,56 C 23,50 22,36 23,21 Z",
  },
  molar: {
    crown: "M 5,4 C 8,0 13,0 14,4 C 14,8 16,10 20,10 C 24,10 26,8 26,4 C 27,0 32,0 35,4 L 36,19 C 28,22 12,22 4,19 Z",
    roots: "M 7,21 L 13,21 C 13,36 12,50 10,56 C 8,50 6,36 7,21 Z M 17,21 L 23,21 C 23,38 22,50 20,55 C 18,50 17,38 17,21 Z M 27,21 L 33,21 C 33,36 31,50 29,56 C 27,50 26,36 27,21 Z",
  },
};

interface ToothIllustrationProps {
  number: number;
  position: "upper" | "lower";
  wholeStatus?: WholeStatus;
  hasAffectedSurfaces: boolean;
}

function ToothIllustration({ number, position, wholeStatus }: ToothIllustrationProps) {
  const type = getToothType(number);
  const { crown, roots } = TOOTH_PATHS[type];

  const isMissing = wholeStatus === "faltante";
  const isImplant = wholeStatus === "implante";
  const isCrown   = wholeStatus === "corona";

  const crownFill = isMissing ? "#d1d5db" : isCrown ? "#fef3c7" : "#f0f0f0";
  const rootFill  = isMissing ? "#d1d5db" : "#e8e0d8";
  const crownStroke = isCrown ? "#d97706" : "#b0b0b0";

  const flip = position === "lower" ? "scale(1,-1) translate(0,-62)" : "";

  return (
    <svg width="40" height="62" viewBox="0 0 40 62" style={{ overflow: "visible" }}>
      <g transform={flip}>
        {/* Roots */}
        <path d={roots} fill={rootFill} stroke="#b0a090" strokeWidth="0.8" />
        {/* Crown */}
        <path d={crown} fill={crownFill} stroke={crownStroke} strokeWidth="0.8" />
        {/* Crown gradient highlight */}
        {!isMissing && (
          <path
            d={crown}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )}
        {/* Missing X */}
        {isMissing && (
          <>
            <line x1="8" y1="2" x2="32" y2="20" stroke="#9ca3af" strokeWidth="2" />
            <line x1="32" y1="2" x2="8" y2="20" stroke="#9ca3af" strokeWidth="2" />
          </>
        )}
        {/* Crown label */}
        {isCrown && (
          <text x="20" y="14" textAnchor="middle" fontSize="10" fill="#92400e" fontWeight="bold">C</text>
        )}
        {/* Implant symbol */}
        {isImplant && (
          <text x="20" y="15" textAnchor="middle" fontSize="14" fill="#7c3aed">⬡</text>
        )}
      </g>
    </svg>
  );
}

// ─── Surface Wheel ──────────────────────────────────────────────────────────
// Circular diagram divided into 5 sections: V(top) D(right) L(bottom) M(left) O(center)
// cx=20, cy=20, R=18, r=7
// Outer boundary points at 45°,135°,225°,315° ≈ (32.73,32.73),(7.27,32.73),(7.27,7.27),(32.73,7.27)

const CX = 20, CY = 20, R = 18, r = 7;
const K = R * Math.cos(Math.PI / 4); // ≈ 12.73
const x1 = CX + K, y1 = CY + K; // 45°  → bottom-right
const x2 = CX - K, y2 = CY + K; // 135° → bottom-left
const x3 = CX - K, y3 = CY - K; // 225° → top-left
const x4 = CX + K, y4 = CY - K; // 315° → top-right

const rk = r * Math.cos(Math.PI / 4); // inner circle boundary ≈ 4.95
const rx1 = CX + rk, ry1 = CY + rk;
const rx2 = CX - rk, ry2 = CY + rk;
const rx3 = CX - rk, ry3 = CY - rk;
const rx4 = CX + rk, ry4 = CY - rk;

// Sector paths (pie wedges from center)
// Each: M center L start_arc A R,R 0 0,1 end_arc Z  (clockwise)
const SECTOR_PATHS: Record<Surface, string> = {
  V: `M ${CX},${CY} L ${x3},${y3} A ${R},${R} 0 0,1 ${x4},${y4} Z`,
  D: `M ${CX},${CY} L ${x4},${y4} A ${R},${R} 0 0,1 ${x1},${y1} Z`,
  L: `M ${CX},${CY} L ${x1},${y1} A ${R},${R} 0 0,1 ${x2},${y2} Z`,
  M: `M ${CX},${CY} L ${x2},${y2} A ${R},${R} 0 0,1 ${x3},${y3} Z`,
  O: "", // handled as circle
};

// Dividing lines across the wheel (for visual separation even when white)
const DIVIDER_LINES = [
  `M ${x3},${y3} L ${x1},${y1}`,
  `M ${x4},${y4} L ${x2},${y2}`,
];

type ActiveTool =
  | { kind: "surface"; status: SurfaceStatus; surface: Surface }
  | { kind: "whole"; status: WholeStatus }
  | { kind: "eraser" };

interface SurfaceWheelProps {
  surfaces: Partial<Record<Surface, SurfaceStatus>>;
  whole?: WholeStatus;
  interactive: boolean;
  activeTool: ActiveTool | null;
  onSurface: (s: Surface) => void;
  onWhole: () => void;
  uid: string;
}

function SurfaceWheel({ surfaces, whole, interactive, activeTool, onSurface, onWhole, uid }: SurfaceWheelProps) {
  const isMissing = whole === "faltante";
  const isImplant = whole === "implante";
  const isCrown   = whole === "corona";

  const getColor = (s: Surface) => {
    if (isMissing) return "#e5e7eb";
    if (isCrown) return "#fef3c7";
    const st = surfaces[s];
    return st && st !== "sano" ? SURFACE_COLORS[st] : "#ffffff";
  };

  const wheelFill = isMissing ? "#e5e7eb" : isImplant ? "#ede9fe" : undefined;

  const cursorStyle: React.CSSProperties = interactive && activeTool ? { cursor: "pointer" } : {};

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={cursorStyle}>
      <defs>
        <clipPath id={`wheel-clip-${uid}`}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx={CX} cy={CY} r={R} fill={wheelFill ?? "#ffffff"} stroke="#6b7280" strokeWidth="1" />

      {/* Surface sectors */}
      {!isMissing && !isImplant && (
        <g clipPath={`url(#wheel-clip-${uid})`}>
          {(["V","D","L","M"] as Surface[]).map(s => (
            <path
              key={s}
              d={SECTOR_PATHS[s]}
              fill={getColor(s)}
              stroke="#9ca3af"
              strokeWidth="0.5"
              onClick={() => interactive && activeTool && onSurface(s)}
            />
          ))}
          {/* Center (O) */}
          <circle
            cx={CX} cy={CY} r={r}
            fill={getColor("O")}
            stroke="#9ca3af"
            strokeWidth="0.5"
            onClick={() => interactive && activeTool && onSurface("O")}
          />
        </g>
      )}

      {/* Outer ring dividers */}
      {!isMissing && !isImplant && DIVIDER_LINES.map((d, i) => (
        <path key={i} d={d} stroke="#9ca3af" strokeWidth="0.5" clipPath={`url(#wheel-clip-${uid})`} />
      ))}

      {/* Outer border */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#6b7280" strokeWidth="1" />

      {/* Sector labels */}
      {!isMissing && !isImplant && (
        <g fontSize="5" fontFamily="sans-serif" fill="#374151" textAnchor="middle" pointerEvents="none">
          <text x={CX} y={CY - R + 7}>V</text>
          <text x={CX} y={CY + R - 2}>L</text>
          <text x={CX - R + 5} y={CY + 2}>M</text>
          <text x={CX + R - 5} y={CY + 2}>D</text>
        </g>
      )}

      {/* Missing X */}
      {isMissing && (
        <>
          <line x1={CX - 10} y1={CY - 10} x2={CX + 10} y2={CY + 10} stroke="#6b7280" strokeWidth="2.5" />
          <line x1={CX + 10} y1={CY - 10} x2={CX - 10} y2={CY + 10} stroke="#6b7280" strokeWidth="2.5" />
        </>
      )}

      {/* Implant symbol */}
      {isImplant && (
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="14" fill="#7c3aed">⬡</text>
      )}

      {/* Whole-tooth click overlay */}
      {interactive && activeTool && (activeTool.kind === "whole" || activeTool.kind === "eraser") && (
        <circle cx={CX} cy={CY} r={R} fill="transparent" onClick={onWhole} />
      )}

      {/* Crown indicator */}
      {isCrown && !isMissing && (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#d97706" strokeWidth="2" />
      )}
    </svg>
  );
}

// ─── Tooth Column ────────────────────────────────────────────────────────────

interface ToothColumnProps {
  number: number;
  position: "upper" | "lower";
  data?: ToothData;
  interactive: boolean;
  activeTool: ActiveTool | null;
  onApply: (tooth: number, surface: Surface | null, whole: WholeStatus | null, erase?: boolean) => void;
  uid: string;
}

function ToothColumn({ number, position, data, interactive, activeTool, onApply, uid }: ToothColumnProps) {
  const surfaces = data?.surfaces ?? {};
  const whole = data?.whole;
  const hasSurfaces = Object.values(surfaces).some(v => v && v !== "sano");

  const handleSurface = (s: Surface) => {
    if (!activeTool) return;
    if (activeTool.kind === "surface") {
      onApply(number, activeTool.surface, null);
    } else if (activeTool.kind === "eraser") {
      onApply(number, s, null, true);
    }
  };

  const handleWhole = () => {
    if (!activeTool) return;
    if (activeTool.kind === "whole") {
      onApply(number, null, activeTool.status);
    } else if (activeTool.kind === "eraser") {
      onApply(number, null, null, true);
    }
  };

  const illustration = (
    <ToothIllustration
      number={number}
      position={position}
      wholeStatus={whole}
      hasAffectedSurfaces={hasSurfaces}
    />
  );

  const wheel = (
    <SurfaceWheel
      surfaces={surfaces}
      whole={whole}
      interactive={interactive}
      activeTool={activeTool}
      onSurface={handleSurface}
      onWhole={handleWhole}
      uid={`${uid}-${number}`}
    />
  );

  const label = (
    <div className="text-center" style={{ fontSize: "9px", fontWeight: 600, color: "#374151", lineHeight: "12px", height: "12px" }}>
      {number}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: 42 }}>
      {position === "upper" ? (
        <>
          {illustration}
          {wheel}
          {label}
        </>
      ) : (
        <>
          {label}
          {wheel}
          {illustration}
        </>
      )}
    </div>
  );
}

// ─── Arch Row ────────────────────────────────────────────────────────────────

interface ArchRowProps {
  teeth: number[];
  position: "upper" | "lower";
  data: OdontogramData;
  interactive: boolean;
  activeTool: ActiveTool | null;
  onApply: (tooth: number, surface: Surface | null, whole: WholeStatus | null, erase?: boolean) => void;
  uid: string;
}

function ArchRow({ teeth, position, data, interactive, activeTool, onApply, uid }: ArchRowProps) {
  return (
    <div className="flex gap-0.5">
      {teeth.map(n => (
        <ToothColumn
          key={n}
          number={n}
          position={position}
          data={data[n]}
          interactive={interactive}
          activeTool={activeTool}
          onApply={onApply}
          uid={uid}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Odontogram({ value, onChange, readonly = false }: OdontogramProps) {
  const uid = useId().replace(/:/g, "");

  const [activeTool, setActiveTool] = useState<ActiveTool | null>(
    readonly ? null : { kind: "surface", status: "caries", surface: "O" }
  );

  const data = parseOdontogram(value);

  const handleApply = useCallback((
    tooth: number,
    surface: Surface | null,
    wholeStatus: WholeStatus | null,
    erase = false
  ) => {
    if (readonly || !onChange) return;
    const current: ToothData = data[tooth] ?? {};

    let updated: ToothData;

    if (erase) {
      if (surface !== null) {
        const newSurfaces = { ...current.surfaces };
        delete newSurfaces[surface];
        updated = { ...current, surfaces: newSurfaces };
      } else {
        updated = {};
      }
    } else if (wholeStatus !== null) {
      updated = current.whole === wholeStatus
        ? { ...current, whole: undefined }
        : { ...current, whole: wholeStatus };
    } else if (surface !== null && activeTool?.kind === "surface") {
      const prev = current.surfaces?.[activeTool.surface] ?? "sano";
      const next: SurfaceStatus = prev === activeTool.status ? "sano" : activeTool.status;
      updated = { ...current, surfaces: { ...current.surfaces, [activeTool.surface]: next } };
    } else {
      return;
    }

    const newData = { ...data, [tooth]: updated };
    onChange(serializeOdontogram(newData));
  }, [data, activeTool, readonly, onChange]);

  const isToolActive = (tool: ActiveTool): boolean => {
    if (!activeTool) return false;
    if (activeTool.kind !== tool.kind) return false;
    if (tool.kind === "surface" && activeTool.kind === "surface")
      return activeTool.status === tool.status && activeTool.surface === tool.surface;
    if (tool.kind === "whole" && activeTool.kind === "whole")
      return activeTool.status === tool.status;
    return activeTool.kind === "eraser";
  };

  const toggleTool = (tool: ActiveTool) => {
    setActiveTool(prev => {
      if (!prev) return tool;
      if (prev.kind === "eraser" && tool.kind === "eraser") return null;
      if (prev.kind === "surface" && tool.kind === "surface"
        && prev.status === tool.status && prev.surface === tool.surface) return null;
      if (prev.kind === "whole" && tool.kind === "whole"
        && prev.status === tool.status) return null;
      return tool;
    });
  };

  const affected = Object.entries(data).filter(([, td]) => {
    const t = td as ToothData;
    return t.whole || (t.surfaces && Object.values(t.surfaces).some(v => v && v !== "sano"));
  });

  const surfaceLabel: Record<Surface, string> = { O: "Oclusal", V: "Vestibular", L: "Lingual", M: "Mesial", D: "Distal" };
  const activeS = activeTool?.kind === "surface" ? activeTool.surface : "O";

  return (
    <div className="space-y-3 select-none">
      {/* ── Tool Palette ── */}
      {!readonly && (
        <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
          {/* Surface selector */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Superficie activa</p>
            <div className="flex gap-1 mb-2">
              {(["O","V","L","M","D"] as Surface[]).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`flex-1 text-[10px] py-0.5 rounded border font-semibold transition-colors ${activeS === s && activeTool?.kind === "surface" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => {
                    const status = activeTool?.kind === "surface" ? activeTool.status : "caries";
                    toggleTool({ kind: "surface", status, surface: s });
                  }}
                  title={surfaceLabel[s]}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SURFACE_STATUSES.map(status => {
                const tool: ActiveTool = { kind: "surface", status, surface: activeS };
                const active = isToolActive(tool);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${active ? "ring-2 ring-offset-1 ring-gray-500" : "hover:opacity-80"}`}
                    style={{ background: SURFACE_COLORS[status], borderColor: SURFACE_COLORS[status], color: status === "sellante" || status === "por_realizar" ? "#374151" : "white" }}
                  >
                    {SURFACE_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Whole-tooth + eraser */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Diente completo</p>
            <div className="flex flex-wrap gap-1.5">
              {WHOLE_STATUSES.map(status => {
                const tool: ActiveTool = { kind: "whole", status };
                const active = isToolActive(tool);
                const labels: Record<WholeStatus, string> = { faltante: "Faltante", implante: "Implante", corona: "Corona" };
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${active ? "ring-2 ring-offset-1 ring-gray-500" : "hover:opacity-80"}`}
                    style={{ background: WHOLE_COLORS[status], borderColor: WHOLE_COLORS[status], color: "white" }}
                  >
                    {labels[status]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => toggleTool({ kind: "eraser" })}
                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${isToolActive({ kind: "eraser" }) ? "ring-2 ring-offset-1 ring-gray-500 bg-gray-200 border-gray-500" : "bg-white border-gray-400 hover:bg-gray-100"}`}
              >
                ✕ Borrar
              </button>
            </div>
          </div>

          {/* Status bar */}
          {activeTool && (
            <p className="text-[10px] text-muted-foreground">
              {activeTool.kind === "surface" &&
                `Herramienta: ${SURFACE_LABELS[activeTool.status]} · ${surfaceLabel[activeTool.surface]}`}
              {activeTool.kind === "whole" &&
                `Herramienta: ${activeTool.status === "faltante" ? "Diente faltante" : activeTool.status === "implante" ? "Implante" : "Corona"} — clic en el diente`}
              {activeTool.kind === "eraser" && "Herramienta: Borrador"}
            </p>
          )}
        </div>
      )}

      {/* ── Chart ── */}
      <div className="border border-border rounded-lg bg-white overflow-x-auto">
        <div className="min-w-max p-3 space-y-0">

          {/* Upper arch */}
          <div className="flex justify-center">
            <div className="flex gap-0.5 items-end">
              <ArchRow teeth={UPPER_RIGHT} position="upper" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} uid={uid} />
              <div className="w-px bg-gray-300 self-stretch mx-1" />
              <ArchRow teeth={UPPER_LEFT} position="upper" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} uid={uid} />
            </div>
          </div>

          {/* Midline */}
          <div className="border-t-2 border-dashed border-gray-300 my-1" />

          {/* Lower arch */}
          <div className="flex justify-center">
            <div className="flex gap-0.5 items-start">
              <ArchRow teeth={LOWER_RIGHT} position="lower" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} uid={uid} />
              <div className="w-px bg-gray-300 self-stretch mx-1" />
              <ArchRow teeth={LOWER_LEFT} position="lower" data={data} interactive={!readonly} activeTool={activeTool} onApply={handleApply} uid={uid} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3">
        {SURFACE_STATUSES.map(s => (
          <span key={s} className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: SURFACE_COLORS[s] }} />
            {SURFACE_LABELS[s]}
          </span>
        ))}
        {WHOLE_STATUSES.map(s => {
          const labels: Record<WholeStatus, string> = { faltante: "Faltante", implante: "Implante", corona: "Corona" };
          return (
            <span key={s} className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 rounded-full border flex-shrink-0" style={{ background: WHOLE_COLORS[s] }} />
              {labels[s]}
            </span>
          );
        })}
      </div>

      {/* ── Summary ── */}
      {affected.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Piezas registradas:</p>
          <div className="flex flex-wrap gap-1.5">
            {affected.sort(([a], [b]) => Number(a) - Number(b)).map(([tooth, td]) => {
              const t = td as ToothData;
              const parts: string[] = [];
              if (t.whole) {
                const wl: Record<WholeStatus, string> = { faltante: "Faltante", implante: "Implante", corona: "Corona" };
                parts.push(wl[t.whole]);
              }
              if (t.surfaces) {
                for (const [s, st] of Object.entries(t.surfaces)) {
                  if (st && st !== "sano") parts.push(`${s}:${SURFACE_LABELS[st as SurfaceStatus]}`);
                }
              }
              return (
                <span key={tooth} className="text-[11px] px-2 py-0.5 bg-muted rounded border border-border font-mono">
                  {tooth}: {parts.join(", ")}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
