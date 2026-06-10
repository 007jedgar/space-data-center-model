"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  EARTH_LOCATIONS,
  calcEarthDC,
  calcTCOOverTime,
  type EarthDCLocation,
} from "@/lib/earth-dc-model";
import { calcPayload } from "@/lib/payload-model";
import type { HardwareSpec, RadiatorSpec, LaunchVehicle } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  vehicle: LaunchVehicle;
  chipCount: number;
  chipCostUsd: number;
  maintenancePct: number;
  upgradePct: number;
  insurancePct: number;
  locationId: string;
  onLocationChange: (id: string) => void;
  tcoYears: number;
  solarAvailability?: number;
}

function fmtB(usd: number): string {
  const b = usd / 1e9;
  if (b >= 1000) return `$${(b / 1000).toFixed(1)}T`;
  if (b >= 1) return `$${b.toFixed(2)}B`;
  return `$${(usd / 1e6).toFixed(0)}M`;
}
function fmtM(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  return `$${(usd / 1e6).toFixed(1)}M`;
}

const OPEX_COLORS: Record<string, string> = {
  electricity: "#f97316",
  water: "#38bdf8",
  land: "#a3e635",
  labor: "#c084fc",
  maintenance: "#6b7280",
  permits: "#fbbf24",
};

export default function EarthDCComparison({
  hardware, radiator, vehicle, chipCount, chipCostUsd,
  maintenancePct, upgradePct, insurancePct,
  locationId, onLocationChange, tcoYears,
  solarAvailability = 0.6,
}: Props) {
  const location = EARTH_LOCATIONS.find((l) => l.id === locationId) ?? EARTH_LOCATIONS[0];
  const earth = calcEarthDC(chipCount, hardware.tdp_w, chipCostUsd, location);

  // Space CapEx + OpEx — full infrastructure cost (hardware + solar + launch)
  const payload = calcPayload(
    { hardware, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 },
    0, 0, chipCostUsd, solarAvailability
  );
  const space_hardware_usd = payload.costs.total_hardware_usd;
  const space_launch_usd = payload.launch_cost_usd(vehicle);
  const space_capex_usd = space_hardware_usd + space_launch_usd;

  // OpEx: chips refresh annually, solar/radiators/robots do not
  const chip_refresh_usd = payload.costs.chips_usd * (upgradePct / 100);
  const non_chip_asset_usd = space_capex_usd - payload.costs.chips_usd;
  const maintenance_usd = non_chip_asset_usd * (maintenancePct / 100);
  const insurance_usd = space_capex_usd * (insurancePct / 100);
  const space_annual_opex_usd = chip_refresh_usd + maintenance_usd + insurance_usd;

  const space_tco5 = space_capex_usd + space_annual_opex_usd * 5;
  const space_tco10 = space_capex_usd + space_annual_opex_usd * 10;

  const tcoData = calcTCOOverTime(earth, space_capex_usd, space_annual_opex_usd, tcoYears);

  // Find crossover year (space cheaper than earth)
  const crossover = tcoData.find((r) => r.space_tco_b <= r.earth_tco_b);

  // OpEx breakdown bar data
  const opexBreakdown = [
    { name: "Electricity", value: parseFloat((earth.opex.electricity_usd_per_yr / 1e6).toFixed(1)), key: "electricity" },
    { name: "Labor", value: parseFloat((earth.opex.labor_usd_per_yr / 1e6).toFixed(1)), key: "labor" },
    { name: "Maintenance", value: parseFloat((earth.opex.maintenance_usd_per_yr / 1e6).toFixed(1)), key: "maintenance" },
    { name: "Water", value: parseFloat((earth.opex.water_usd_per_yr / 1e6).toFixed(1)), key: "water" },
    { name: "Land", value: parseFloat((earth.opex.land_usd_per_yr / 1e6).toFixed(1)), key: "land" },
    { name: "Permits/Tax", value: parseFloat((earth.opex.permits_compliance_usd_per_yr / 1e6).toFixed(1)), key: "permits" },
  ].sort((a, b) => b.value - a.value);

  // All-locations comparison
  const locationCompare = EARTH_LOCATIONS.map((loc) => {
    const r = calcEarthDC(chipCount, hardware.tdp_w, chipCostUsd, loc);
    return {
      name: loc.name.split(" (")[0],
      "CapEx ($B)": parseFloat((r.capex.total_usd / 1e9).toFixed(2)),
      "OpEx/yr ($B)": parseFloat((r.opex.total_usd_per_yr / 1e9).toFixed(2)),
      "10yr TCO ($B)": parseFloat((r.tco_10yr_usd / 1e9).toFixed(2)),
    };
  });

  // Space vs Earth summary rows
  const summaryRows = [
    {
      item: "Hardware CapEx",
      earth: fmtB(earth.capex.hardware_usd),
      space: fmtB(chipCostUsd * chipCount),
      note: "Same GPUs — same cost",
    },
    {
      item: "Construction / Launch",
      earth: fmtM(earth.capex.construction_usd),
      space: fmtM(space_launch_usd),
      note: `$${location.construction_usd_per_mw.toLocaleString()}/MW build vs $${vehicle.cost_per_kg_usd}/kg × ${(payload.total_mass_kg / 1000).toFixed(0)} t`,
    },
    {
      item: "Solar power array (CapEx)",
      earth: "Grid-tied (no panels)",
      space: fmtB(payload.costs.solar_power_usd),
      note: `${(payload.solar_panel_kw_needed / 1000).toFixed(0)} GW panels needed (${(solarAvailability * 100).toFixed(0)}% availability → ${(payload.total_power_kw / 1000).toFixed(0)} GW TDP) × $300k/kW`,
      spaceIsExpensive: true,
    },
    {
      item: "Network switches (CapEx)",
      earth: fmtB(payload.costs.networking_usd),
      space: fmtB(payload.costs.networking_usd),
      note: "Same NVLink/InfiniBand switches — same cost both locations",
    },
    {
      item: "Electricity (annual)",
      earth: fmtM(earth.opex.electricity_usd_per_yr),
      space: "$0",
      note: `${(earth.tdp_kw_total / 1000).toFixed(0)} GW × PUE ${1.3} × $${location.electricity_usd_per_kwh}/kWh`,
    },
    {
      item: "Water (annual)",
      earth: fmtM(earth.opex.water_usd_per_yr),
      space: "$0",
      note: `${(earth.water_gallons_per_yr / 1e6).toFixed(0)}M gal/yr evaporative cooling`,
    },
    {
      item: "Land (annual)",
      earth: fmtM(earth.opex.land_usd_per_yr),
      space: "$0",
      note: `${earth.dc_footprint_acres.toFixed(0)} acres × $${location.land_usd_per_acre_per_yr.toLocaleString()}/acre/yr`,
    },
    {
      item: "Labor (annual)",
      earth: fmtM(earth.opex.labor_usd_per_yr),
      space: "~$0",
      note: `${earth.employees.toLocaleString()} employees (remote ops only in space)`,
    },
    {
      item: "Maintenance + refresh (annual)",
      earth: fmtM(earth.opex.maintenance_usd_per_yr),
      space: fmtM(space_annual_opex_usd),
      note: `Space: chip refresh ${upgradePct}%/yr on chips · maintenance ${maintenancePct}%/yr on infra · insurance ${insurancePct}%/yr. Solar/radiators not refreshed annually.`,
    },
    {
      item: "5yr TCO",
      earth: fmtB(earth.tco_5yr_usd),
      space: fmtB(space_tco5),
      note: "CapEx + 5yr OpEx",
    },
    {
      item: "10yr TCO",
      earth: fmtB(earth.tco_10yr_usd),
      space: fmtB(space_tco10),
      note: "CapEx + 10yr OpEx",
    },
    {
      item: "OpEx/GPU/month",
      earth: `$${earth.opex_per_gpu_per_month_usd.toFixed(0)}`,
      space: `$${(space_annual_opex_usd / chipCount / 12).toFixed(0)}`,
      note: "Ongoing cost per GPU",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Location selector */}
      <div className="flex flex-wrap gap-2">
        {EARTH_LOCATIONS.map((loc) => (
          <button key={loc.id} onClick={() => onLocationChange(loc.id)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              loc.id === locationId
                ? "border-green-400 text-green-300 bg-green-950/40"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}>
            {loc.name.split("(")[0].trim()}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 -mt-4">{location.notes}</p>

      {/* Key stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DualStat label="Annual electricity" earth={fmtM(earth.opex.electricity_usd_per_yr)} space="$0"
          earthSub={`${(earth.facility_power_kw / 1000).toFixed(0)} GW × $${location.electricity_usd_per_kwh}/kWh × PUE 1.3`}
          spaceSub="Solar — no ongoing fuel cost" />
        <DualStat label="Solar array CapEx" earth="N/A (grid-tied)"
          space={fmtB(payload.costs.solar_power_usd)}
          spaceSub={`${(payload.total_power_kw / 1000).toFixed(0)} GW × $300k/kW space-grade`}
          earthSub="Paid as electricity over time"
          spaceExpensive />
        <DualStat label="Annual water cost" earth={fmtM(earth.opex.water_usd_per_yr)}
          earthSub={`${(earth.water_gallons_per_yr / 1e9).toFixed(2)}B gal/yr cooling`} space="$0" />
        <DualStat label="Land + labor (annual)" earth={fmtM(earth.opex.land_usd_per_yr + earth.opex.labor_usd_per_yr)}
          earthSub={`${earth.dc_footprint_acres.toFixed(0)} ac · ${earth.employees} FTE`} space="$0" />
      </div>

      {/* TCO over time */}
      <div>
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">
          Cumulative TCO — Space vs Earth ({location.name})
          {crossover && (
            <span className="ml-3 text-green-400 normal-case">
              Crossover: {crossover.year}
            </span>
          )}
          {!crossover && (
            <span className="ml-3 text-yellow-400 normal-case">
              No crossover within {tcoYears}yr window
            </span>
          )}
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tcoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                label={{ value: "Cum. TCO ($B)", angle: -90, position: "insideLeft", fill: "#9ca3af", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                labelStyle={{ color: "#f9fafb" }}
                formatter={(v, name) => [`$${(v as number).toFixed(2)}B`, name]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#d1d5db" }} />
              {crossover && (
                <ReferenceLine x={crossover.year} stroke="#34d399" strokeDasharray="4 2"
                  label={{ value: "Crossover", fill: "#34d399", fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="earth_tco_b" name={`Earth (${location.name.split("(")[0].trim()})`}
                stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="space_tco_b" name="Space DC"
                stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Earth OpEx breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Earth DC Annual OpEx Breakdown</div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opexBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }}
                  label={{ value: "$M/yr", position: "insideBottomRight", offset: -5, fill: "#9ca3af", style: { fontSize: 10 } }} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} width={75} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                  formatter={(v) => [`$${(v as number).toFixed(1)}M/yr`, ""]} />
                <Bar dataKey="value" name="$M/yr" radius={[0, 4, 4, 0]}>
                  {opexBreakdown.map((entry) => (
                    <Cell key={entry.key} fill={OPEX_COLORS[entry.key] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">10yr TCO by Location</div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationCompare} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }}
                  label={{ value: "$B", position: "insideBottomRight", offset: -5, fill: "#9ca3af", style: { fontSize: 10 } }} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} width={95} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                  formatter={(v, name) => [`$${(v as number).toFixed(2)}B`, name]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#d1d5db" }} />
                <Bar dataKey="CapEx ($B)" stackId="a" fill="#3b82f6" />
                <Bar dataKey="OpEx/yr ($B)" stackId="a" fill="#f97316" name="OpEx/yr ($B) × 10" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed comparison table */}
      <div>
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Line-item Comparison</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-300 border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-2 pr-4">Cost Item</th>
                <th className="text-right py-2 pr-4 text-orange-400">Earth DC</th>
                <th className="text-right py-2 pr-4 text-blue-400">Space DC</th>
                <th className="text-left py-2 text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => {
                const spaceZero = row.space === "$0" || row.space === "~$0" || row.space === "0 acres";
                const spaceExpensive = "spaceIsExpensive" in row && row.spaceIsExpensive;
                const isTco = row.item.includes("TCO");
                return (
                  <tr key={row.item} className={`border-b border-gray-800 hover:bg-gray-800/30 ${isTco ? "bg-gray-800/20 font-medium" : ""}`}>
                    <td className="py-1.5 pr-4 text-white">{row.item}</td>
                    <td className={`text-right py-1.5 pr-4 ${spaceZero ? "text-red-300" : "text-gray-300"}`}>{row.earth}</td>
                    <td className={`text-right py-1.5 pr-4 ${spaceZero ? "text-green-300" : spaceExpensive ? "text-red-300" : "text-gray-300"}`}>{row.space}</td>
                    <td className="py-1.5 text-gray-500 text-xs">{row.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Earth DC: PUE = 1.3, WUE = 1.5 gal/kWh, {(0.5).toFixed(1)} acres/MW. Space: solar power included in payload mass model (5 kg/kW).
          Labor in space assumed ~5 remote operations staff.
        </p>
      </div>
    </div>
  );
}

function DualStat({ label, earth, space, earthSub, spaceSub, spaceExpensive }: {
  label: string; earth: string; space: string;
  earthSub?: string; spaceSub?: string; spaceExpensive?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Earth</div>
          <div className="text-sm font-bold text-orange-300">{earth}</div>
          {earthSub && <div className="text-xs text-gray-600 mt-0.5">{earthSub}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-0.5">Space</div>
          <div className={`text-sm font-bold ${spaceExpensive ? "text-red-300" : "text-blue-300"}`}>{space}</div>
          {spaceSub && <div className="text-xs text-gray-600 mt-0.5">{spaceSub}</div>}
        </div>
      </div>
    </div>
  );
}
