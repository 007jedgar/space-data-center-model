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

function fmtMass(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)} Mt`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
}

const STACK_COLORS: Record<string, string> = {
  "Chips":              "#60a5fa",
  "Radiator Panels":    "#f87171",
  "Cooling Loops":      "#fb923c",
  "Solar Power":        "#facc15",
  "Power Distribution": "#a78bfa",
  "Network Switches":   "#34d399",
  "Laser Comm":         "#22d3ee",
  "Repair Robots":      "#f472b6",
  "Structure":          "#6b7280",
  "Attitude Control":   "#94a3b8",
};

export default function PayloadBreakdown({ hardware, radiator, vehicle, chipCount }: Props) {
  const data = hardware.map((hw) => {
    const p = calcPayload({ hardware: hw, radiator, chip_count: chipCount, structural_mass_multiplier: 1.4 });
    const { infra } = p;
    const shortName = hw.name.replace("NVIDIA ", "").replace(" (Blackwell)", "").replace(" SXM5", "")
      .replace("BAE Systems ", "").replace("AMD ", "").replace("AWS ", "");
    return {
      name: shortName,
      "Chips":              parseFloat(infra.chips_kg.toFixed(0)),
      "Radiator Panels":    parseFloat(infra.radiator_panels_kg.toFixed(0)),
      "Cooling Loops":      parseFloat(infra.cooling_loops_kg.toFixed(0)),
      "Solar Power":        parseFloat(infra.solar_power_kg.toFixed(0)),
      "Power Distribution": parseFloat(infra.power_distribution_kg.toFixed(0)),
      "Network Switches":   parseFloat(infra.networking_switches_kg.toFixed(0)),
      "Laser Comm":         parseFloat(infra.laser_comm_kg.toFixed(0)),
      "Repair Robots":      parseFloat(infra.repair_robots_kg.toFixed(0)),
      "Structure":          parseFloat(infra.structure_kg.toFixed(0)),
      "Attitude Control":   parseFloat(infra.attitude_control_kg.toFixed(0)),
      total: p.total_mass_kg,
      launches: p.launches_needed(vehicle),
      cost_m: parseFloat((p.launch_cost_usd(vehicle) / 1e6).toFixed(1)),
      tflops: parseFloat(p.compute_tflops.toFixed(0)),
      tops: parseFloat(p.compute_tops.toFixed(0)),
      infra,
    };
  });

  return (
    <div className="space-y-6">
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
              label={{ value: "Mass (kg)", angle: -90, position: "insideLeft", fill: "#9ca3af", style: { fontSize: 11 } }} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
              formatter={(v) => [fmtMass(v as number), ""]} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#d1d5db" }} />
            {Object.entries(STACK_COLORS).map(([key, color]) => (
              <Bar key={key} dataKey={key} stackId="a" fill={color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-hardware detail breakdown */}
      {data.slice(0, 1).map((row) => (
        <div key={row.name} className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {Object.entries(STACK_COLORS).map(([key, color]) => {
            const val = row[key as keyof typeof row] as number;
            const pct = (val / row.total * 100).toFixed(1);
            return (
              <div key={key} className="bg-gray-800/50 rounded p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} />
                  <span className="text-gray-400">{key}</span>
                </div>
                <div className="text-white font-medium">{fmtMass(val)}</div>
                <div className="text-gray-500">{pct}% of total</div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-300 border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 pr-4">Hardware</th>
              <th className="text-right py-2 pr-4">Total Mass</th>
              <th className="text-right py-2 pr-4">Net Switches</th>
              <th className="text-right py-2 pr-4">Radiator</th>
              <th className="text-right py-2 pr-4">Solar</th>
              <th className="text-right py-2 pr-4">TOPS</th>
              <th className="text-right py-2 pr-4">Launches</th>
              <th className="text-right py-2">Launch Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-b border-gray-800 hover:bg-gray-800/40">
                <td className="py-1.5 pr-4 font-medium text-white">{row.name}</td>
                <td className="text-right py-1.5 pr-4">{fmtMass(row.total)}</td>
                <td className="text-right py-1.5 pr-4 text-green-300">{fmtMass(row["Network Switches"])}</td>
                <td className="text-right py-1.5 pr-4 text-red-300">{fmtMass(row["Radiator Panels"])}</td>
                <td className="text-right py-1.5 pr-4 text-yellow-300">{fmtMass(row["Solar Power"])}</td>
                <td className="text-right py-1.5 pr-4">{row.tops.toLocaleString()}</td>
                <td className="text-right py-1.5 pr-4">{row.launches.toLocaleString()}</td>
                <td className="text-right py-1.5">${row.cost_m.toLocaleString()}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
