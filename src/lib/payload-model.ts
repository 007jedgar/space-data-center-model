import type { HardwareSpec, LaunchVehicle } from "./hardware-specs";
import type { RadiatorSpec } from "./hardware-specs";

export interface ClusterConfig {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  chip_count: number;
  structural_mass_multiplier: number; // 1.3–2.0x for structure, power dist, cooling loops
}

export interface PayloadBreakdown {
  chip_mass_kg: number;
  radiator_mass_kg: number;
  structure_mass_kg: number;
  power_system_mass_kg: number; // solar panels + batteries: ~5 kg/kW
  total_mass_kg: number;
  total_power_kw: number;
  compute_tflops: number;
  compute_tops: number;
  tflops_per_kg: number;
  tops_per_kg: number;
  launches_needed: (vehicle: LaunchVehicle) => number;
  launch_cost_usd: (vehicle: LaunchVehicle) => number;
}

// Solar panel specific mass: ~5 kg/kW (modern GaAs triple-junction, ~300 W/m²)
const SOLAR_KG_PER_KW = 5;

export function calcPayload(config: ClusterConfig): PayloadBreakdown {
  const { hardware, radiator, chip_count, structural_mass_multiplier } = config;

  const chip_mass_kg = hardware.mass_kg * chip_count;
  const total_power_kw = (hardware.tdp_w * chip_count) / 1000;
  const radiator_mass_kg = total_power_kw * radiator.specific_mass_kg_per_kw;
  const power_system_mass_kg = total_power_kw * SOLAR_KG_PER_KW;

  // structure = multiplier applied to electronics only (not radiator/power, which have own structure)
  const structure_mass_kg = chip_mass_kg * (structural_mass_multiplier - 1);

  const total_mass_kg = chip_mass_kg + radiator_mass_kg + power_system_mass_kg + structure_mass_kg;

  const compute_tflops = hardware.compute_tflops * chip_count;
  const compute_tops = (hardware.compute_tops ?? 0) * chip_count;

  return {
    chip_mass_kg,
    radiator_mass_kg,
    structure_mass_kg,
    power_system_mass_kg,
    total_mass_kg,
    total_power_kw,
    compute_tflops,
    compute_tops,
    tflops_per_kg: compute_tflops / total_mass_kg,
    tops_per_kg: compute_tops / total_mass_kg,
    launches_needed: (v: LaunchVehicle) => Math.ceil(total_mass_kg / v.payload_to_leo_kg),
    launch_cost_usd: (v: LaunchVehicle) => total_mass_kg * v.cost_per_kg_usd,
  };
}

export interface ComparisonRow {
  name: string;
  chip_count: number;
  total_power_kw: number;
  total_mass_kg: number;
  radiator_mass_kg: number;
  radiator_pct: number;
  tflops_per_kg: number;
  tops_per_kg: number;
  starship_launches: number;
  falcon9_launches: number;
  starship_cost_m: number;
  falcon9_cost_m: number;
}
