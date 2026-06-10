"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { HardwareSpec } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec[];
  metric: "tops_per_watt" | "tflops_per_watt" | "tops_per_kg";
}

const METRIC_LABELS: Record<Props["metric"], string> = {
  tops_per_watt: "TOPS / Watt",
  tflops_per_watt: "TFLOPS / Watt",
  tops_per_kg: "TOPS / kg",
};

const CATEGORY_COLORS: Record<HardwareSpec["category"], string> = {
  "current-space": "#60a5fa",
  datacenter: "#f97316",
};

export default function EfficiencyComparison({ hardware, metric }: Props) {
  const data = hardware
    .filter((hw) => {
      if (metric === "tops_per_watt" || metric === "tops_per_kg") return hw.compute_tops != null;
      return true;
    })
    .map((hw) => {
      let value = 0;
      if (metric === "tops_per_watt") value = (hw.compute_tops ?? 0) / hw.tdp_w;
      if (metric === "tflops_per_watt") value = hw.compute_tflops / hw.tdp_w;
      if (metric === "tops_per_kg") value = (hw.compute_tops ?? 0) / hw.mass_kg;
      return {
        name: hw.name.replace("NVIDIA ", "").replace(" (Blackwell)", "").replace(" SXM5", "").replace("BAE Systems ", "").replace("AMD ", ""),
        value: parseFloat(value.toFixed(4)),
        category: hw.category,
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 130, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: METRIC_LABELS[metric], position: "insideBottomRight", offset: -5, fill: "#9ca3af", style: { fontSize: 11 } }} />
          <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} width={125} />
          <Tooltip
            contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
            labelStyle={{ color: "#f9fafb" }}
            formatter={(v) => [(v as number).toFixed(4), METRIC_LABELS[metric]]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={CATEGORY_COLORS[entry.category]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
