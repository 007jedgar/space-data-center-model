"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  REVENUE_TIERS,
  REVENUE_PER_GPU_PER_MONTH,
  projectRevenue,
  calcPayback,
  CHIP_COSTS_USD_MAP,
  type RevenueProjectionParams,
} from "@/lib/revenue-model";
import { calcPayload } from "@/lib/payload-model";
import type { HardwareSpec, RadiatorSpec, LaunchVehicle } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  vehicle: LaunchVehicle;
  chipCount: number;
  chipCostUsd: number;
  projectionParams: RevenueProjectionParams;
  projectionYears: number;
  annualOpexM: number; // maintenance + insurance + refresh $M/yr
}

export default function RevenueProjection({
  hardware,
  radiator,
  vehicle,
  chipCount,
  chipCostUsd,
  projectionParams,
  projectionYears,
  annualOpexM,
}: Props) {
  // GPU-equivalent revenue — normalize vs H100 TOPS/TFLOPS
  const h100_tops = 3958;
  const gpu_equiv = hardware.compute_tops != null
    ? (hardware.compute_tops / h100_tops)
    : (hardware.compute_tflops / 60);
  const base_monthly_usd = chipCount * REVENUE_PER_GPU_PER_MONTH * Math.min(gpu_equiv, 1.5) * projectionParams.space_premium;

  // CAPEX
  const payload = calcPayload({ hardware, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 });
  const hardware_cost_usd = chipCostUsd * chipCount;
  const launch_cost_usd = payload.launch_cost_usd(vehicle);
  const capex_total_usd = hardware_cost_usd + launch_cost_usd;
  const annual_opex_usd = annualOpexM * 1e6;

  const payback = calcPayback(capex_total_usd, base_monthly_usd, annual_opex_usd);
  const projection = projectRevenue(base_monthly_usd, projectionYears, projectionParams);

  // Tier comparison (using selected chip count proportionally)
  const tierData = REVENUE_TIERS.map((t) => {
    const equiv = hardware.compute_tops != null
      ? (hardware.compute_tops / h100_tops)
      : (hardware.compute_tflops / 60);
    const monthly = t.gpu_count * REVENUE_PER_GPU_PER_MONTH * Math.min(equiv, 1.5) * t.utilization * projectionParams.space_premium;
    const capex_chips = chipCostUsd * t.gpu_count;
    const p = calcPayload({ hardware, radiator, chip_count: t.gpu_count, structural_mass_multiplier: 1.4 });
    const capex_launch = p.launch_cost_usd(vehicle);
    const capex = capex_chips + capex_launch;
    const pb = calcPayback(capex, monthly, annual_opex_usd * (t.gpu_count / chipCount));
    return {
      name: t.name,
      gpus: t.gpu_count,
      monthly_m: parseFloat((monthly / 1e6).toFixed(1)),
      annual_b: parseFloat((monthly * 12 / 1e9).toFixed(2)),
      capex_b: parseFloat((capex / 1e9).toFixed(2)),
      payback_mo: pb.payback_months > 999 ? 999 : parseFloat(pb.payback_months.toFixed(1)),
      roi_5yr: parseFloat(pb.roi_5yr_pct.toFixed(0)),
      npv_10yr_b: parseFloat(pb.npv_10yr_b.toFixed(1)),
    };
  });

  // Chart data: cumulative revenue vs CAPEX recovery
  const cumulativeData = projection.map((r) => {
    const cumRev = r.net_annual_revenue_b * r.year - (annualOpexM / 1000) * r.year;
    return {
      year: r.calendar_year,
      "Nominal revenue ($B/yr)": parseFloat(r.nominal_annual_revenue_b.toFixed(2)),
      "Net revenue w/ demand growth ($B/yr)": parseFloat(r.net_annual_revenue_b.toFixed(2)),
      "Real (deflated) ($B/yr)": parseFloat(r.real_annual_revenue_b.toFixed(2)),
      "Cum. net revenue ($B)": parseFloat(Math.max(0, cumRev).toFixed(2)),
    };
  });

  const capexLineB = payback.capex_total_m / 1000;
  const paybackYear = 2026 + payback.payback_years;

  return (
    <div className="space-y-6">
      {/* Payback summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Monthly revenue" value={fmt(payback.monthly_revenue_m, "M")} color="text-green-300" />
        <StatCard label="Annual revenue" value={fmt(payback.annual_revenue_m / 1000, "B")} color="text-green-300" />
        <StatCard label="CAPEX (hw + launch)" value={fmt(payback.capex_total_m / 1000, "B")} color="text-red-300" />
        <StatCard label="Payback" value={payback.payback_months > 120 ? `${payback.payback_years.toFixed(1)} yr` : `${payback.payback_months.toFixed(1)} mo`} color="text-yellow-300" />
        <StatCard label="10yr NPV" value={`${payback.npv_10yr_b >= 0 ? "+" : ""}${payback.npv_10yr_b.toFixed(1)}B`} color={payback.npv_10yr_b >= 0 ? "text-green-300" : "text-red-300"} />
      </div>

      {/* Revenue projection chart */}
      <div>
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Annual Revenue Projection — Three Scenarios</div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                label={{ value: "$B/yr", angle: -90, position: "insideLeft", fill: "#9ca3af", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                labelStyle={{ color: "#f9fafb" }} formatter={(v) => [`$${(v as number).toFixed(2)}B`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#d1d5db" }} />
              <ReferenceLine y={capexLineB} stroke="#ef4444" strokeDasharray="4 2"
                label={{ value: "CAPEX", fill: "#ef4444", fontSize: 10 }} />
              <Line type="monotone" dataKey="Nominal revenue ($B/yr)" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net revenue w/ demand growth ($B/yr)" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Real (deflated) ($B/yr)" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <div><span className="text-blue-400">Nominal:</span> CPI inflation only ({(projectionParams.cpi_rate * 100).toFixed(0)}%/yr). Dollar-value of same contract grows.</div>
          <div><span className="text-green-400">Net:</span> Demand growth ({(projectionParams.demand_growth * 100).toFixed(0)}%/yr) minus price deflation ({(projectionParams.compute_price_deflation * 100).toFixed(0)}%/yr). Most realistic for secular AI growth.</div>
          <div><span className="text-red-400">Real (deflated):</span> If GPU prices fall with no demand offset — worst case.</div>
        </div>
      </div>

      {/* Tier comparison */}
      <div>
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Revenue by Datacenter Scale Tier</div>
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData} layout="vertical" margin={{ top: 5, right: 40, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }}
                label={{ value: "$B/yr revenue", position: "insideBottomRight", offset: -5, fill: "#9ca3af", style: { fontSize: 10 } }} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} width={115} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                formatter={(v, name) => [`$${(v as number).toFixed(2)}B`, name]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#d1d5db" }} />
              <Bar dataKey="annual_b" name="Annual revenue ($B)" fill="#34d399" radius={[0, 4, 4, 0]} />
              <Bar dataKey="capex_b" name="CAPEX ($B)" fill="#f87171" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tier table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-300 border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 pr-3">Tier</th>
              <th className="text-right py-2 pr-3">GPUs</th>
              <th className="text-right py-2 pr-3">Monthly Rev</th>
              <th className="text-right py-2 pr-3">Annual Rev</th>
              <th className="text-right py-2 pr-3">CAPEX</th>
              <th className="text-right py-2 pr-3">Payback</th>
              <th className="text-right py-2 pr-3">5yr ROI</th>
              <th className="text-right py-2">10yr NPV</th>
            </tr>
          </thead>
          <tbody>
            {tierData.map((row) => (
              <tr key={row.name}
                className={`border-b border-gray-800 hover:bg-gray-800/40 ${row.gpus === chipCount ? "bg-blue-950/30" : ""}`}>
                <td className="py-1.5 pr-3 font-medium text-white">{row.name}</td>
                <td className="text-right py-1.5 pr-3 text-gray-400">{row.gpus.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-3 text-green-300">${row.monthly_m.toFixed(0)}M</td>
                <td className="text-right py-1.5 pr-3 text-green-300">${row.annual_b.toFixed(2)}B</td>
                <td className="text-right py-1.5 pr-3 text-red-300">${row.capex_b.toFixed(2)}B</td>
                <td className="text-right py-1.5 pr-3 text-yellow-300">
                  {row.payback_mo >= 999 ? "∞" : row.payback_mo < 24 ? `${row.payback_mo.toFixed(1)} mo` : `${(row.payback_mo / 12).toFixed(1)} yr`}
                </td>
                <td className={`text-right py-1.5 pr-3 ${row.roi_5yr >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {row.roi_5yr >= 0 ? "+" : ""}{row.roi_5yr}%
                </td>
                <td className={`text-right py-1.5 ${row.npv_10yr_b >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {row.npv_10yr_b >= 0 ? "+" : ""}${row.npv_10yr_b.toFixed(1)}B
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(b: number, unit: string): string {
  if (unit === "B") {
    if (b >= 1000) return `$${(b / 1000).toFixed(1)}T`;
    if (b >= 1) return `$${b.toFixed(2)}B`;
    return `$${(b * 1000).toFixed(0)}M`;
  }
  return `$${b.toFixed(0)}${unit}`;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/60 rounded p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`font-bold text-sm ${color}`}>{value}</div>
    </div>
  );
}
