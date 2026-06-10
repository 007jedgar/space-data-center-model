"use client";

import { calcStructure, SHIELDING_LABELS, type ShieldingLevel } from "@/lib/structure-model";
import { calcRadiatorRequirements } from "@/lib/thermal-model";
import type { HardwareSpec, RadiatorSpec } from "@/lib/hardware-specs";

// GaAs triple-junction: ~28% efficiency × 1.37 kW/m² space irradiance = 0.384 kW/m²
const SOLAR_KW_PER_M2 = 0.384;
const SOLAR_KG_PER_KW = 5;
const SOLAR_COST_USD_PER_KW = 300_000;

interface Props {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  chipCount: number;
  shielding: ShieldingLevel;
  solarAvailability?: number;
}

export default function StructureVisualizer({ hardware, radiator, chipCount, shielding, solarAvailability = 0.6 }: Props) {
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

  // Solar panel sizing
  const total_power_kw = (hardware.tdp_w * chipCount) / 1000;
  const solar_kw_needed = total_power_kw / solarAvailability;
  const solar_area_m2 = solar_kw_needed / SOLAR_KW_PER_M2;
  const solar_mass_kg = solar_kw_needed * SOLAR_KG_PER_KW;
  const solar_cost_usd = solar_kw_needed * SOLAR_COST_USD_PER_KW;
  // Solar panels deploy as large flat wings — approx side length
  const solar_wing_side_m = Math.sqrt(solar_area_m2 / 2); // two wings

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
          label={`Solar panels (${(solarAvailability * 100).toFixed(0)}% avail.)`}
          value={`${solar_area_m2.toFixed(0)} m²`}
          sub={`${fmtMass(solar_mass_kg)} · ${solar_wing_side_m.toFixed(0)} m wings`}
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

      {/* Mass + Cost breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">
            Structure mass breakdown
          </div>
          <div className="space-y-1.5">
            {(() => {
              const total = totalStructureMass + thermal.radiator_mass_kg + solar_mass_kg;
              return (<>
                <MassBar label="Solar panels" kg={solar_mass_kg} total={total} color="bg-yellow-400" />
                <MassBar label="Radiator system" kg={thermal.radiator_mass_kg} total={total} color="bg-red-500" />
                <MassBar label="Radiation shield" kg={s.shield_mass_kg} total={total} color="bg-purple-500" />
                <MassBar label="Structural truss (est.)" kg={s.total_dry_mass_estimate_kg} total={total} color="bg-gray-500" />
              </>);
            })()}
          </div>
          <div className="mt-3 text-sm text-gray-300">
            Total:{" "}
            <span className="text-white font-bold">{fmtMass(totalStructureMass + thermal.radiator_mass_kg + solar_mass_kg)}</span>{" "}
            <span className="text-gray-500">({((totalStructureMass + thermal.radiator_mass_kg + solar_mass_kg) / ISS_MASS_KG * 100).toFixed(1)}% of ISS mass)</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">
            Fabrication cost (excl. launch)
          </div>
          <div className="space-y-2 text-xs">
            <CostRow
              label={`Solar panels — GaAs triple-junction`}
              usd={solar_cost_usd}
              note={`$300k/kW · ${solar_kw_needed.toFixed(0)} kW needed · ${(solarAvailability * 100).toFixed(0)}% orbit availability`}
            />
            <CostRow
              label={`Radiator — ${radiator.name.split("(")[0].trim()}`}
              usd={(hardware.tdp_w * chipCount / 1000) * radiator.cost_usd_per_kw}
              note={`$${radiator.cost_usd_per_kw.toLocaleString()}/kW · TRL ${radiator.trl}`}
            />
            <CostRow
              label={`Shielding — ${SHIELDING_LABELS[shielding].split("(")[0].trim()}`}
              usd={s.shield_cost_usd}
              note={`$300/kg × ${s.shield_mass_kg.toFixed(0)} kg Al`}
            />
            <div className="border-t border-gray-700 pt-2 mt-2">
              <CostRow
                label="Solar + radiator + shielding subtotal"
                usd={solar_cost_usd + (hardware.tdp_w * chipCount / 1000) * radiator.cost_usd_per_kw + s.shield_cost_usd}
                note="fabrication only, not including launch"
                bold
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Solar panels last 15–25 yrs in space (no weather degradation). At mass production, costs
            could fall 5–10× from today&apos;s bespoke space-grade prices.
          </p>
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
        <span>{fmtMass(kg)} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CostRow({ label, usd, note, bold }: { label: string; usd: number; note: string; bold?: boolean }) {
  const formatted = usd >= 1e9 ? `$${(usd / 1e9).toFixed(2)}B`
    : usd >= 1e6 ? `$${(usd / 1e6).toFixed(1)}M`
    : `$${usd.toLocaleString()}`;
  return (
    <div className={`flex justify-between items-start gap-4 ${bold ? "font-medium" : ""}`}>
      <div>
        <div className={bold ? "text-white" : "text-gray-300"}>{label}</div>
        <div className="text-gray-500 text-[11px]">{note}</div>
      </div>
      <div className={`shrink-0 ${bold ? "text-yellow-300 text-sm" : "text-gray-200"}`}>{formatted}</div>
    </div>
  );
}

function fmtMass(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)} Mt`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
}
