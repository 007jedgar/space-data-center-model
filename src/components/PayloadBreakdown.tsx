"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { calcPayload } from "@/lib/payload-model";
import type { HardwareSpec, RadiatorSpec, LaunchVehicle } from "@/lib/hardware-specs";

interface Props {
  hardware: HardwareSpec[];
  radiator: RadiatorSpec;
  vehicle: LaunchVehicle;
  chipCount: number;
}

export default function PayloadBreakdown({ hardware, radiator, vehicle, chipCount }: Props) {
  const data = hardware.map((hw) => {
    const p = calcPayload({ hardware: hw, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 });
    return {
      name: hw.name.replace("NVIDIA ", "").replace(" (Blackwell)", "").replace(" SXM5", ""),
      "Chips": parseFloat(p.chip_mass_kg.toFixed(1)),
      "Radiator": parseFloat(p.radiator_mass_kg.toFixed(1)),
      "Power System": parseFloat(p.power_system_mass_kg.toFixed(1)),
      "Structure": parseFloat(p.structure_mass_kg.toFixed(1)),
      total: p.total_mass_kg,
      launches: p.launches_needed(vehicle),
      cost_m: parseFloat((p.launch_cost_usd(vehicle) / 1e6).toFixed(1)),
      tflops: parseFloat(p.compute_tflops.toFixed(0)),
      tops: parseFloat(p.compute_tops.toFixed(0)),
    };
  });

  return (
    <div className="space-y-4">
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: "Mass (kg)", angle: -90, position: "insideLeft", fill: "#9ca3af", style: { fontSize: 11 } }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
            <Bar dataKey="Chips" stackId="a" fill="#60a5fa" />
            <Bar dataKey="Radiator" stackId="a" fill="#f87171" />
            <Bar dataKey="Power System" stackId="a" fill="#facc15" />
            <Bar dataKey="Structure" stackId="a" fill="#6b7280" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-300 border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 pr-4">Hardware</th>
              <th className="text-right py-2 pr-4">Total Mass (kg)</th>
              <th className="text-right py-2 pr-4">TFLOPS</th>
              <th className="text-right py-2 pr-4">TOPS</th>
              <th className="text-right py-2 pr-4">{vehicle.name} Launches</th>
              <th className="text-right py-2">Launch Cost ($M)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-b border-gray-800 hover:bg-gray-800/40">
                <td className="py-1.5 pr-4 font-medium text-white">{row.name}</td>
                <td className="text-right py-1.5 pr-4">{row.total.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-4">{row.tflops.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-4">{row.tops.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-4">{row.launches}</td>
                <td className="text-right py-1.5">${row.cost_m}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
