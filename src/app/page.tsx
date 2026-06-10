"use client";

import { useState } from "react";
import HardwareCard from "@/components/HardwareCard";
import ThermalChart from "@/components/ThermalChart";
import PayloadBreakdown from "@/components/PayloadBreakdown";
import EfficiencyComparison from "@/components/EfficiencyComparison";
import CapexTimeline from "@/components/CapexTimeline";
import StructureVisualizer from "@/components/StructureVisualizer";
import RevenueProjection from "@/components/RevenueProjection";
import EarthDCComparison from "@/components/EarthDCComparison";
import RealDCExamples from "@/components/RealDCExamples";
import SourcesList from "@/components/SourcesList";
import Glossary from "@/components/Glossary";
import {
  CURRENT_SPACE_HARDWARE,
  DATACENTER_HARDWARE,
  RADIATOR_SPECS,
  LAUNCH_VEHICLES,
  type LaunchVehicle,
} from "@/lib/hardware-specs";
import { calcRadiatorRequirements } from "@/lib/thermal-model";
import { calcPayload } from "@/lib/payload-model";
import { SHIELDING_LABELS, type ShieldingLevel } from "@/lib/structure-model";
import { DEFAULT_PROJECTION_PARAMS, type RevenueProjectionParams } from "@/lib/revenue-model";

const ALL_HARDWARE = [...CURRENT_SPACE_HARDWARE, ...DATACENTER_HARDWARE];
const CHIP_PRESETS = [30000, 100000, 300000, 1000000];

const CHIP_COSTS_USD: Record<string, number> = {
  rad750: 200000,
  "versal-ai-edge": 5000,
  "leon4-fpga": 150000,
  "h100-sxm5": 30000,
  "h200-sxm5": 35000,
  b100: 40000,
  b200: 50000,
  trainium2: 20000,
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function fmtMass(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)}Mt`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}t`;
  return `${kg.toFixed(0)} kg`;
}

function fmtCost(m: number): string {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

function fmtPower(kw: number): string {
  if (kw >= 1_000_000) return `${(kw / 1_000_000).toFixed(1)} TW`;
  if (kw >= 1_000) return `${(kw / 1_000).toFixed(1)} GW`;
  return `${kw.toFixed(0)} kW`;
}

function fmtArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(1)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(1)} ha`;
  return `${m2.toFixed(0)} m²`;
}

export default function Home() {
  // Hardware selection
  const [selectedHardware, setSelectedHardware] = useState<Set<string>>(
    new Set(["rad750", "versal-ai-edge", "h100-sxm5", "b200"])
  );
  const [focusHwId, setFocusHwId] = useState("h100-sxm5");

  // Radiator / vehicle presets
  const [radiatorId, setRadiatorId] = useState("loop-heat-pipe-panel");
  const [vehicleId, setVehicleId] = useState("starship");

  // Scale
  const [chipCount, setChipCount] = useState(30000);
  const [annualCapexM, setAnnualCapexM] = useState(1000); // $M/year
  const [capexYears, setCapexYears] = useState(10);

  // Overridable cost sliders
  const [launchCostOverride, setLaunchCostOverride] = useState<number | null>(null);
  const [maintenancePctPerYear, setMaintenancePctPerYear] = useState(5); // % of capex
  const [upgradePctPerYear, setUpgradePctPerYear] = useState(10); // % of capex
  const [insurancePctPerYear, setInsurancePctPerYear] = useState(3); // % of capex (debris/MEO)

  // Shielding
  const [shielding, setShielding] = useState<ShieldingLevel>("leo-cots");

  // Earth DC comparison
  const [earthLocationId, setEarthLocationId] = useState("us-avg");
  const [tcoYears, setTcoYears] = useState(30);
  const [solarAvailability, setSolarAvailability] = useState(0.6); // LEO default

  // Revenue / projection
  const [projectionYears, setProjectionYears] = useState(10);
  const [spacePremium, setSpacePremium] = useState(1.0);
  const [demandGrowth, setDemandGrowth] = useState(0.30);
  const [computeDeflation, setComputeDeflation] = useState(0.20);
  const [cpiRate, setCpiRate] = useState(0.03);
  const projectionParams: RevenueProjectionParams = {
    cpi_rate: cpiRate,
    compute_price_deflation: computeDeflation,
    demand_growth: demandGrowth,
    space_premium: spacePremium,
  };

  // Chart axes
  const [thermalY, setThermalY] = useState<
    "radiator_area_m2" | "radiator_mass_kg" | "equivalent_football_fields"
  >("radiator_area_m2");
  const [effMetric, setEffMetric] = useState<
    "tops_per_watt" | "tflops_per_watt" | "tops_per_kg"
  >("tops_per_watt");

  const radiator = RADIATOR_SPECS.find((r) => r.id === radiatorId)!;
  const baseVehicle = LAUNCH_VEHICLES.find((v) => v.id === vehicleId)!;

  // Apply launch cost override
  const vehicle: LaunchVehicle = launchCostOverride != null
    ? { ...baseVehicle, cost_per_kg_usd: launchCostOverride }
    : baseVehicle;

  const visibleHardware = ALL_HARDWARE.filter((h) => selectedHardware.has(h.id));
  const displayHardware = visibleHardware.length > 0 ? visibleHardware : ALL_HARDWARE;
  const focusHw = ALL_HARDWARE.find((h) => h.id === focusHwId) ?? ALL_HARDWARE[3];

  function toggleHardware(id: string) {
    setSelectedHardware((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const h100 = DATACENTER_HARDWARE.find((h) => h.id === "h100-sxm5")!;

  // OPEX-adjusted total cost factor per year
  const opexMultiplier = 1 + (maintenancePctPerYear + upgradePctPerYear + insurancePctPerYear) / 100;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Space Datacenter Scale Model
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Energy · Heat Rejection · Structure · Cost — Current Space vs. AI Datacenter Hardware
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* ── Glossary ── */}
        <Glossary />

        {/* ── Hardware Selector ── */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            Hardware — Click to toggle comparison
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {ALL_HARDWARE.map((hw) => (
              <HardwareCard
                key={hw.id}
                spec={hw}
                selected={selectedHardware.has(hw.id)}
                onClick={() => toggleHardware(hw.id)}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded border border-blue-500 bg-blue-950/40" />
              Current Space Hardware
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded border border-orange-500 bg-orange-950/40" />
              Datacenter / Future Space
            </span>
          </div>
        </section>

        {/* ── Controls ── */}
        <section className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Radiator */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Radiator Technology
              </label>
              <select
                value={radiatorId}
                onChange={(e) => setRadiatorId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {RADIATOR_SPECS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.specific_mass_kg_per_kw} kg/kW)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{radiator.notes}</p>
            </div>

            {/* Launch Vehicle */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Launch Vehicle
              </label>
              <select
                value={vehicleId}
                onChange={(e) => { setVehicleId(e.target.value); setLaunchCostOverride(null); }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {LAUNCH_VEHICLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (${v.cost_per_kg_usd}/kg, {v.payload_to_leo_kg.toLocaleString()} kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Radiation Shielding */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Radiation Shielding (Al equivalent)
              </label>
              <select
                value={shielding}
                onChange={(e) => setShielding(e.target.value as ShieldingLevel)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                {(Object.keys(SHIELDING_LABELS) as ShieldingLevel[]).map((k) => (
                  <option key={k} value={k}>{SHIELDING_LABELS[k]}</option>
                ))}
              </select>
            </div>

            {/* Chip Count */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Chip Count: {fmtCount(chipCount)}
              </label>
              <input
                type="range" min={1000} max={1000000} step={1000} value={chipCount}
                onChange={(e) => setChipCount(Number(e.target.value))}
                className="w-full accent-blue-400"
              />
              <div className="text-xs text-gray-500 mt-1">
                Training GPT-4 scale: ~30k chips · GPT-5 scale: ~100k · Hyperscale: 1M+
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {CHIP_PRESETS.map((n) => (
                  <button key={n} onClick={() => setChipCount(n)}
                    className={`text-xs px-2 py-1 rounded border ${chipCount === n ? "border-blue-400 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {fmtCount(n)}
                  </button>
                ))}
              </div>
            </div>

            {/* Annual CAPEX */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Annual CAPEX: ${annualCapexM.toLocaleString()}M / yr
              </label>
              <input
                type="range" min={100} max={50000} step={100} value={annualCapexM}
                onChange={(e) => setAnnualCapexM(Number(e.target.value))}
                className="w-full accent-green-400"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[500, 1000, 5000, 10000, 50000].map((n) => (
                  <button key={n} onClick={() => setAnnualCapexM(n)}
                    className={`text-xs px-2 py-1 rounded border ${annualCapexM === n ? "border-green-400 text-green-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    ${(n / 1000).toFixed(n < 1000 ? 1 : 0)}B
                  </button>
                ))}
              </div>
            </div>

            {/* Projection Years */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                CAPEX Timeline: {capexYears} years
              </label>
              <input
                type="range" min={1} max={20} step={1} value={capexYears}
                onChange={(e) => setCapexYears(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            {/* Launch Cost Override */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Launch Cost Override: {launchCostOverride != null ? `$${launchCostOverride}/kg` : `(using ${vehicle.name})`}
              </label>
              <input
                type="range" min={100} max={15000} step={50}
                value={launchCostOverride ?? baseVehicle.cost_per_kg_usd}
                onChange={(e) => setLaunchCostOverride(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-gray-500">$100/kg (Starship target)</span>
                <button onClick={() => setLaunchCostOverride(null)} className="ml-auto text-xs text-gray-500 hover:text-white">
                  reset
                </button>
              </div>
            </div>

            {/* Maintenance */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Maintenance: {maintenancePctPerYear}% of capex/yr
              </label>
              <input
                type="range" min={0} max={30} step={1} value={maintenancePctPerYear}
                onChange={(e) => setMaintenancePctPerYear(Number(e.target.value))}
                className="w-full accent-orange-400"
              />
            </div>

            {/* Upgrade */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Hardware Refresh: {upgradePctPerYear}% of capex/yr
              </label>
              <input
                type="range" min={0} max={50} step={1} value={upgradePctPerYear}
                onChange={(e) => setUpgradePctPerYear(Number(e.target.value))}
                className="w-full accent-pink-400"
              />
            </div>

            {/* Insurance (debris) */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Debris/Insurance Premium: {insurancePctPerYear}% of capex/yr
              </label>
              <input
                type="range" min={0} max={20} step={0.5} value={insurancePctPerYear}
                onChange={(e) => setInsurancePctPerYear(Number(e.target.value))}
                className="w-full accent-red-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Micro-debris collision risk premium. LEO ~1–5%, GEO ~0.5%.
              </p>
            </div>

            {/* Space premium */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Space DC Revenue Premium: {((spacePremium - 1) * 100).toFixed(0)}%
              </label>
              <input
                type="range" min={0.5} max={2.0} step={0.05} value={spacePremium}
                onChange={(e) => setSpacePremium(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Premium vs ground DC. Defense/sovereign contracts may command +20–50%. Negative = discount for reliability risk.
              </p>
            </div>

            {/* AI demand growth */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                AI Demand Growth: {(demandGrowth * 100).toFixed(0)}%/yr
              </label>
              <input
                type="range" min={0} max={1.0} step={0.05} value={demandGrowth}
                onChange={(e) => setDemandGrowth(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Historical AI compute demand growth: ~3–5×/yr (2020–2025). Offset to compute price deflation.
              </p>
            </div>

            {/* Compute price deflation */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Compute Price Deflation: {(computeDeflation * 100).toFixed(0)}%/yr
              </label>
              <input
                type="range" min={0} max={0.5} step={0.05} value={computeDeflation}
                onChange={(e) => setComputeDeflation(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                GPU rental prices fall as supply grows. Historical: ~20%/yr. Faster with Blackwell ramp.
              </p>
            </div>

            {/* CPI */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                CPI Inflation: {(cpiRate * 100).toFixed(1)}%/yr
              </label>
              <input
                type="range" min={0} max={0.10} step={0.005} value={cpiRate}
                onChange={(e) => setCpiRate(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Solar Availability (Orbit) */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                Solar Availability: {(solarAvailability * 100).toFixed(0)}% — orbit efficiency
              </label>
              <input
                type="range" min={0.30} max={1.0} step={0.05} value={solarAvailability}
                onChange={(e) => setSolarAvailability(Number(e.target.value))}
                className="w-full accent-yellow-300"
              />
              <div className="flex gap-3 mt-2 flex-wrap">
                {([["LEO 60%", 0.6], ["Dawn-dusk 85%", 0.85], ["GEO 99%", 0.99]] as [string, number][]).map(([label, val]) => (
                  <button key={val} onClick={() => setSolarAvailability(val)}
                    className={`text-xs px-2 py-1 rounded border ${Math.abs(solarAvailability - val) < 0.01 ? "border-yellow-400 text-yellow-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fraction of time solar panels generate power. Space panels ~37% more efficient (no atmosphere, 1.37 kW/m²).
                Panels needed = TDP / availability. GEO reduces panel mass ~40% vs LEO.
              </p>
            </div>

          </div>

          {/* OPEX summary */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-4 text-xs text-gray-400">
            <span>OPEX rate: <span className="text-white">{(maintenancePctPerYear + upgradePctPerYear + insurancePctPerYear)}% of capex/yr</span></span>
            <span>OPEX multiplier: <span className="text-white">{opexMultiplier.toFixed(2)}×</span></span>
            <span>Annual total (capex+opex): <span className="text-yellow-300">{fmtCost(annualCapexM * opexMultiplier)}/yr</span></span>
            <span>Over {capexYears}y: <span className="text-yellow-300">{fmtCost(annualCapexM * opexMultiplier * capexYears)}</span></span>
          </div>
        </section>

        {/* ── Quick Stats ── */}
        {displayHardware.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayHardware.slice(0, 4).map((hw) => {
              const thermal = calcRadiatorRequirements(hw.tdp_w, radiator.operating_temp_k, radiator.emissivity, radiator.specific_mass_kg_per_kw, chipCount);
              const payload = calcPayload({ hardware: hw, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 });
              const launchCost = payload.launch_cost_usd(vehicle);
              const chipCost = (CHIP_COSTS_USD[hw.id] ?? 30000) * chipCount;
              const totalCostM = (launchCost + chipCost) / 1e6;
              const tdpKw = (hw.tdp_w * chipCount) / 1000;
              const { infra } = payload;
              const chipPct = (infra.chips_kg / payload.total_mass_kg * 100).toFixed(0);
              const radPct = (infra.radiator_panels_kg / payload.total_mass_kg * 100).toFixed(0);
              const netPct = (infra.networking_switches_kg / payload.total_mass_kg * 100).toFixed(0);
              return (
                <div key={hw.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-2">
                  <div className="text-xs text-gray-400 truncate">{hw.name}</div>
                  <div className="text-2xl font-bold text-white">{fmtCost(totalCostM)}</div>
                  <div className="text-xs text-gray-400">
                    hardware + full infrastructure launch · {fmtCount(chipCount)} chips
                  </div>
                  <div className="border-t border-gray-800 pt-2 grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-gray-500">TDP: </span><span className="text-orange-300">{fmtPower(tdpKw)}</span></div>
                    <div><span className="text-gray-500">Rad area: </span><span className="text-red-300">{fmtArea(thermal.radiator_area_m2)}</span></div>
                    <div><span className="text-gray-500">Total mass: </span><span className="text-yellow-300">{fmtMass(payload.total_mass_kg)}</span></div>
                    <div><span className="text-gray-500">Launches: </span><span className="text-green-300">{payload.launches_needed(vehicle).toLocaleString()}×</span></div>
                  </div>
                  <div className="border-t border-gray-800 pt-2 text-xs text-gray-500">
                    Mass split: chips {chipPct}% · rad {radPct}% · net {netPct}%
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Earth DC Comparison ── */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-gray-400">
                Space vs Earth Datacenter — TCO Comparison
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Full line-item: electricity, water, land, labor, construction vs launch cost.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">TCO window:</label>
              <input type="number" min={1} max={50} value={tcoYears}
                onChange={(e) => setTcoYears(Number(e.target.value))}
                className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
              <span className="text-xs text-gray-500">years</span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <EarthDCComparison
              hardware={focusHw}
              radiator={radiator}
              vehicle={vehicle}
              chipCount={chipCount}
              chipCostUsd={CHIP_COSTS_USD[focusHw.id] ?? 30000}
              maintenancePct={maintenancePctPerYear}
              upgradePct={upgradePctPerYear}
              insurancePct={insurancePctPerYear}
              locationId={earthLocationId}
              onLocationChange={setEarthLocationId}
              tcoYears={tcoYears}
              solarAvailability={solarAvailability}
            />
          </div>
        </section>

        {/* ── Revenue Projections ── */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-gray-400">
                Revenue Projections
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Anchor: 200k H100s · 300 MW · $1B/month (2026). Normalized by GPU compute-equivalent.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Focus hardware:</label>
              <select
                value={focusHwId}
                onChange={(e) => setFocusHwId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
              >
                {ALL_HARDWARE.filter((h) => h.category === "datacenter").map((hw) => (
                  <option key={hw.id} value={hw.id}>{hw.name}</option>
                ))}
              </select>
              <label className="text-xs text-gray-500 ml-2">Projection years:</label>
              <input type="number" min={1} max={30} value={projectionYears}
                onChange={(e) => setProjectionYears(Number(e.target.value))}
                className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <RevenueProjection
              hardware={focusHw}
              radiator={radiator}
              vehicle={vehicle}
              chipCount={chipCount}
              chipCostUsd={CHIP_COSTS_USD[focusHw.id] ?? 30000}
              projectionParams={projectionParams}
              projectionYears={projectionYears}
              annualOpexM={annualCapexM * (maintenancePctPerYear + upgradePctPerYear + insurancePctPerYear) / 100}
            />
          </div>
        </section>

        {/* ── CAPEX Timeline ── */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <h2 className="text-sm uppercase tracking-widest text-gray-400">
              CAPEX Timeline — Infrastructure Build-out
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Focus hardware:</label>
              <select
                value={focusHwId}
                onChange={(e) => setFocusHwId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
              >
                {ALL_HARDWARE.map((hw) => (
                  <option key={hw.id} value={hw.id}>{hw.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <CapexTimeline
              hardware={focusHw}
              radiator={radiator}
              vehicle={vehicle}
              annualCapexM={annualCapexM * opexMultiplier}
              years={capexYears}
              chipCostUsd={CHIP_COSTS_USD[focusHw.id] ?? 30000}
            />
            <p className="text-xs text-gray-500 mt-2">
              Per-chip cost includes hardware + launch. OPEX ({(maintenancePctPerYear + upgradePctPerYear + insurancePctPerYear)}%/yr) folded into effective annual budget.
              Launch: ${vehicle.cost_per_kg_usd}/kg via {vehicle.name}.
            </p>
          </div>
        </section>

        {/* ── Structure & Size ── */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <h2 className="text-sm uppercase tracking-widest text-gray-400">
              Physical Structure & Size
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Hardware:</label>
              <select
                value={focusHwId}
                onChange={(e) => setFocusHwId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
              >
                {ALL_HARDWARE.map((hw) => (
                  <option key={hw.id} value={hw.id}>{hw.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <StructureVisualizer
              hardware={focusHw}
              radiator={radiator}
              chipCount={chipCount}
              shielding={shielding}
              solarAvailability={solarAvailability}
            />
            <p className="text-xs text-gray-500 mt-2">
              Bounding box = compute cube + deployed radiator panels. Compute cube sized from chip volume at 60% packing efficiency.
              Shielding wraps compute cube only. Radiators deploy flat (no shielding required).
            </p>
          </div>
        </section>

        {/* ── Efficiency ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-widest text-gray-400">Compute Efficiency</h2>
            <div className="flex gap-2">
              {(["tops_per_watt", "tflops_per_watt", "tops_per_kg"] as const).map((m) => (
                <button key={m} onClick={() => setEffMetric(m)}
                  className={`text-xs px-3 py-1 rounded border ${effMetric === m ? "border-blue-400 text-blue-300 bg-blue-950/40" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                  {m.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <EfficiencyComparison hardware={displayHardware} metric={effMetric} />
          </div>
        </section>

        {/* ── Thermal Scale ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-widest text-gray-400">
              Radiator Scale vs Chip Count
            </h2>
            <div className="flex gap-2">
              {(["radiator_area_m2", "radiator_mass_kg", "equivalent_football_fields"] as const).map((m) => (
                <button key={m} onClick={() => setThermalY(m)}
                  className={`text-xs px-3 py-1 rounded border ${thermalY === m ? "border-orange-400 text-orange-300 bg-orange-950/40" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                  {m.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <ThermalChart hardware={displayHardware} radiator={radiator} yAxis={thermalY} />
            <p className="text-xs text-gray-500 mt-2">
              Stefan-Boltzmann · T_space = 3.5 K (eclipse) · Radiator = {radiator.operating_temp_k} K · ε = {radiator.emissivity}
            </p>
          </div>
        </section>

        {/* ── Payload Breakdown ── */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            Payload Mass Breakdown — {fmtCount(chipCount)} chips via {vehicle.name}
          </h2>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <PayloadBreakdown hardware={displayHardware} radiator={radiator} vehicle={vehicle} chipCount={chipCount} />
            <p className="text-xs text-gray-500 mt-2">
              Structural 1.4× on chip mass. Solar power: 5 kg/kW. Radiator: {radiator.specific_mass_kg_per_kw} kg/kW.
            </p>
          </div>
        </section>

        {/* ── Reference Scale ── */}
        <section className="border border-gray-800 rounded-lg p-6 bg-gray-900/50">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Reference Scale</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Ref label="ISS radiator area" value="1,600 m²" sub="6 panels" />
            <Ref label="ISS total mass" value="420 t" sub="~30 Falcon 9 launches" />
            <Ref label="US power grid avg" value="450 GW" sub="for scale comparison" />
            <Ref label={`H100 ×${fmtCount(chipCount)} TDP`}
              value={fmtPower((h100.tdp_w * chipCount) / 1000)}
              sub={`${fmtCount(chipCount)}× H100 @ 700W`} />
            <Ref label={`H100 ×${fmtCount(chipCount)} radiator`}
              value={fmtArea(calcRadiatorRequirements(h100.tdp_w, radiator.operating_temp_k, radiator.emissivity, radiator.specific_mass_kg_per_kw, chipCount).radiator_area_m2)}
              sub={radiator.name.split("(")[0].trim()} />
            <Ref label={`H100 ×${fmtCount(chipCount)} total mass`}
              value={fmtMass(calcPayload({ hardware: h100, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 }).total_mass_kg)}
              sub="chips+rad+solar+net+lasers+robots+structure" />
            <Ref label={`H100 ×${fmtCount(chipCount)} launches`}
              value={`${calcPayload({ hardware: h100, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 }).launches_needed(vehicle).toLocaleString()}×`}
              sub={vehicle.name} />
            <Ref label={`H100 ×${fmtCount(chipCount)} cost`}
              value={fmtCost(((CHIP_COSTS_USD["h100-sxm5"] * chipCount) + calcPayload({ hardware: h100, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 }).launch_cost_usd(vehicle)) / 1e6)}
              sub="hardware + launch only" />
          </div>
        </section>

        {/* ── Real-world DC Examples ── */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            Real-world Datacenters — Size, Cost, Employees & Revenue
          </h2>
          <RealDCExamples />
        </section>

        {/* ── Sources ── */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            Sources & References
          </h2>
          <SourcesList />
        </section>

      </main>

      <footer className="border-t border-gray-800 px-6 py-4 text-xs text-gray-600 max-w-7xl mx-auto">
        All models are estimates. TDP from official specs. Thermal sizing via Stefan-Boltzmann law.
        Shielding via NASA SP-8013 Al-equivalent depths. Launch costs approximate market rates 2025–2026.
        Not financial advice.
      </footer>
    </div>
  );
}

function Ref({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-800/60 rounded p-3">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="text-white font-bold">{value}</div>
      <div className="text-gray-500 text-xs mt-0.5">{sub}</div>
    </div>
  );
}
