"use client";

import { calcStructure, SHIELDING_LABELS, type ShieldingLevel } from "@/lib/structure-model";
import { calcRadiatorRequirements } from "@/lib/thermal-model";
import type { HardwareSpec, RadiatorSpec } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  chipCount: number;
  shielding: ShieldingLevel;
}

export default function StructureVisualizer({ hardware, radiator, chipCount, shielding }: Props) {
  const thermal = calcRadiatorRequirements(
    hardware.tdp_w,
    radiator.operating_temp_k,
    radiator.emissivity,
    radiator.specific_mass_kg_per_kw,
    chipCount
  );

  const s = calcStructure(
    chipCount,
    hardware.volume_l,
    thermal.radiator_area_m2,
    shielding
  );

  const [bw, bh, bd] = s.bounding_box_m;

  // ISS ref for scale
  const ISS_LENGTH_M = 109;
  const ISS_MASS_KG = 420000;

  const totalStructureMass = s.shield_mass_kg + s.total_dry_mass_estimate_kg;

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Compute cube"
          value={`${s.chip_array_side_m.toFixed(1)} m³ side`}
          sub={`${(s.chip_volume_m3 * 1000).toFixed(0)} L volume`}
        />
        <StatCard
          label="Radiator area"
          value={`${thermal.radiator_area_m2.toFixed(0)} m²`}
          sub={`${(thermal.radiator_area_m2 / 5351).toFixed(2)} football fields`}
        />
        <StatCard
          label="Shield thickness"
          value={`${s.shield_al_thickness_mm.toFixed(0)} mm Al`}
          sub={`${s.shield_mass_kg.toFixed(0)} kg · ${SHIELDING_LABELS[shielding].split("(")[0].trim()}`}
        />
        <StatCard
          label="Bounding box"
          value={`${bw.toFixed(0)}×${bh.toFixed(0)}×${bd.toFixed(0)} m`}
          sub={`vs ISS: ${ISS_LENGTH_M} m long`}
        />
      </div>

      {/* Scale bar diagram */}
      <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
        <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">
          Scale comparison — top-down footprint
        </div>
        <div className="space-y-3">
          <ScaleBar label={`This structure (${bw.toFixed(0)}×${bd.toFixed(0)} m)`} meters={bw} maxM={Math.max(bw, ISS_LENGTH_M, 92)} color="bg-blue-500" />
          <ScaleBar label={`ISS (${ISS_LENGTH_M} m)`} meters={ISS_LENGTH_M} maxM={Math.max(bw, ISS_LENGTH_M, 92)} color="bg-gray-500" />
          <ScaleBar label="American football field (91 m)" meters={91} maxM={Math.max(bw, ISS_LENGTH_M, 92)} color="bg-green-700" />
        </div>
      </div>

      {/* Mass breakdown */}
      <div>
        <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">
          Structure mass breakdown
        </div>
        <div className="space-y-1.5">
          <MassBar label="Radiation shield" kg={s.shield_mass_kg} total={totalStructureMass + thermal.radiator_mass_kg} color="bg-purple-500" />
          <MassBar label="Radiator system" kg={thermal.radiator_mass_kg} total={totalStructureMass + thermal.radiator_mass_kg} color="bg-red-500" />
          <MassBar label="Structural (est.)" kg={s.total_dry_mass_estimate_kg} total={totalStructureMass + thermal.radiator_mass_kg} color="bg-gray-500" />
        </div>
        <div className="mt-3 text-sm text-gray-300">
          Shielding + structure + radiator:{" "}
          <span className="text-white font-bold">
            {(totalStructureMass + thermal.radiator_mass_kg).toFixed(0)} kg
          </span>{" "}
          <span className="text-gray-500">
            ({((totalStructureMass + thermal.radiator_mass_kg) / ISS_MASS_KG * 100).toFixed(1)}% of ISS)
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function ScaleBar({ label, meters, maxM, color }: { label: string; meters: number; maxM: number; color: string }) {
  const pct = Math.min((meters / maxM) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>{label}</span>
        <span>{meters.toFixed(0)} m</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3">
        <div className={`${color} h-3 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MassBar({ label, kg, total, color }: { label: string; kg: number; total: number; color: string }) {
  const pct = (kg / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>{label}</span>
        <span>{kg.toFixed(0)} kg ({pct.toFixed(0)}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
