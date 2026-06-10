"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { buildScaleCurve } from "@/lib/thermal-model";
import type { HardwareSpec, RadiatorSpec } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec[];
  radiator: RadiatorSpec;
  yAxis: "radiator_area_m2" | "radiator_mass_kg" | "equivalent_football_fields";
  chipCounts?: number[];
}

const COLORS = ["#60a5fa", "#34d399", "#f472b6", "#facc15", "#a78bfa", "#fb923c"];

const Y_LABELS: Record<Props["yAxis"], string> = {
  radiator_area_m2: "Radiator Area (m²)",
  radiator_mass_kg: "Radiator Mass (kg)",
  equivalent_football_fields: "Football Fields Equiv.",
};

const DEFAULT_COUNTS = [1000, 10000, 30000, 100000, 300000, 1000000];

export default function ThermalChart({ hardware, radiator, yAxis, chipCounts }: Props) {
  const counts = chipCounts ?? DEFAULT_COUNTS;

  const series = hardware.map((hw, i) => {
    const curve = buildScaleCurve(
      hw.tdp_w,
      radiator.operating_temp_k,
      radiator.emissivity,
      radiator.specific_mass_kg_per_kw,
      counts
    );
    return { hw, curve, color: COLORS[i % COLORS.length] };
  });

  const chartData = counts.map((n, idx) => {
    const point: Record<string, number> = { chip_count: n };
    series.forEach(({ hw, curve }) => {
      point[hw.id] = parseFloat(curve[idx][yAxis].toFixed(2));
    });
    return point;
  });

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="chip_count"
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            label={{ value: "# Chips", position: "insideBottomRight", offset: -5, fill: "#9ca3af" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            label={{ value: Y_LABELS[yAxis], angle: -90, position: "insideLeft", fill: "#9ca3af", style: { fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
            labelStyle={{ color: "#f9fafb" }}
            itemStyle={{ color: "#d1d5db" }}
            formatter={(v) => (v as number).toLocaleString()}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
          {series.map(({ hw, color }) => (
            <Line
              key={hw.id}
              type="monotone"
              dataKey={hw.id}
              name={hw.name}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
