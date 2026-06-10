"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { buildCapexTimeline } from "@/lib/structure-model";
import type { HardwareSpec, RadiatorSpec, LaunchVehicle } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  vehicle: LaunchVehicle;
  annualCapexM: number;
  years: number;
  chipCostUsd: number;
}

export default function CapexTimeline({
  hardware,
  radiator,
  vehicle,
  annualCapexM,
  years,
  chipCostUsd,
}: Props) {
  const data = buildCapexTimeline(
    hardware.tdp_w,
    chipCostUsd,
    hardware.mass_kg,
    hardware.compute_tflops,
    hardware.compute_tops ?? 0,
    radiator.specific_mass_kg_per_kw,
    vehicle.cost_per_kg_usd,
    vehicle.payload_to_leo_kg,
    1.4,
    5,
    annualCapexM,
    years
  ).map((r) => ({
    ...r,
    cumulative_spend_b: parseFloat((r.cumulative_spend_m / 1000).toFixed(2)),
    cumulative_tflops_k: parseFloat((r.cumulative_tflops / 1000).toFixed(1)),
    cumulative_tops_k: parseFloat((r.cumulative_tops / 1000).toFixed(1)),
  }));

  const last = data[data.length - 1];

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Year 1 chips" value={data[0]?.cumulative_chips.toLocaleString() ?? "—"} />
        <Stat label={`Year ${years} chips`} value={last?.cumulative_chips.toLocaleString() ?? "—"} />
        <Stat label="Total spend" value={`$${last?.cumulative_spend_b.toFixed(1)}B`} />
        <Stat label="Total launches" value={`${last?.launches_to_date.toLocaleString()}`} />
        <Stat
          label={`Year ${years} TOPS`}
          value={
            last?.cumulative_tops_k > 1000
              ? `${(last.cumulative_tops_k / 1000).toFixed(0)}M`
              : `${last?.cumulative_tops_k.toFixed(0)}k`
          }
        />
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="year"
              stroke="#9ca3af"
              tick={{ fontSize: 11 }}
              label={{ value: "Year", position: "insideBottomRight", offset: -5, fill: "#9ca3af" }}
            />
            <YAxis
              yAxisId="left"
              stroke="#60a5fa"
              tick={{ fontSize: 11 }}
              label={{
                value: "Cum. Spend ($B)",
                angle: -90,
                position: "insideLeft",
                fill: "#60a5fa",
                style: { fontSize: 10 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#34d399"
              tick={{ fontSize: 11 }}
              label={{
                value: "Cum. Chips",
                angle: 90,
                position: "insideRight",
                fill: "#34d399",
                style: { fontSize: 10 },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 6,
              }}
              labelStyle={{ color: "#f9fafb" }}
              labelFormatter={(v) => `Year ${v}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
            <Bar
              yAxisId="left"
              dataKey="cumulative_spend_b"
              name="Cumulative Spend ($B)"
              fill="#3b82f6"
              fillOpacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative_chips"
              name="Cumulative Chips"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-300 border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 pr-4">Year</th>
              <th className="text-right py-2 pr-4">Cum. Chips</th>
              <th className="text-right py-2 pr-4">Cum. Spend</th>
              <th className="text-right py-2 pr-4">Launches</th>
              <th className="text-right py-2 pr-4">TFLOPS</th>
              <th className="text-right py-2">TOPS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="border-b border-gray-800 hover:bg-gray-800/40">
                <td className="py-1.5 pr-4 text-white">{row.year}</td>
                <td className="text-right py-1.5 pr-4">{row.cumulative_chips.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-4 text-blue-300">
                  ${row.cumulative_spend_b.toFixed(1)}B
                </td>
                <td className="text-right py-1.5 pr-4 text-yellow-300">
                  {row.launches_to_date.toLocaleString()}
                </td>
                <td className="text-right py-1.5 pr-4">
                  {row.cumulative_tflops_k > 1000
                    ? `${(row.cumulative_tflops_k / 1000).toFixed(0)}M`
                    : `${row.cumulative_tflops_k.toFixed(0)}k`}
                </td>
                <td className="text-right py-1.5">
                  {row.cumulative_tops_k > 1000
                    ? `${(row.cumulative_tops_k / 1000).toFixed(0)}M`
                    : `${row.cumulative_tops_k.toFixed(0)}k`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/60 rounded p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-white font-bold text-sm">{value}</div>
    </div>
  );
}
