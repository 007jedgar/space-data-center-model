"use client";

import type { HardwareSpec } from "@/lib/hardware-specs";

interface Props {
  spec: HardwareSpec;
  selected?: boolean;
  onClick?: () => void;
}

const categoryColor: Record<HardwareSpec["category"], string> = {
  "current-space": "border-blue-500 bg-blue-950/40",
  datacenter: "border-orange-500 bg-orange-950/40",
};

const eraTag: Record<HardwareSpec["era"], string> = {
  present: "bg-green-800 text-green-200",
  future: "bg-purple-800 text-purple-200",
};

export default function HardwareCard({ spec, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-all ${categoryColor[spec.category]} ${
        selected ? "ring-2 ring-white" : "hover:brightness-125"
      } w-full`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-white leading-tight">{spec.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${eraTag[spec.era]}`}>
          {spec.era}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
        <Stat label="TDP" value={`${spec.tdp_w} W`} />
        <Stat label="Mass" value={`${spec.mass_kg} kg`} />
        <Stat label="TFLOPS" value={fmt(spec.compute_tflops)} />
        {spec.compute_tops != null && <Stat label="TOPS" value={fmt(spec.compute_tops)} />}
        <Stat label="Node" value={`${spec.technology_node_nm} nm`} />
        <Stat label="Rad-hard" value={spec.radiation_hardened ? "Yes" : "No"} />
      </div>

      <p className="mt-2 text-xs text-gray-400 leading-tight">{spec.notes}</p>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1) return n.toFixed(1);
  if (n >= 0.001) return `${(n * 1000).toFixed(2)}m`;
  return n.toExponential(2);
}
