import type { HardwareSpec, LaunchVehicle } from "./hardware-specs";
import type { RadiatorSpec } from "./hardware-specs";

export interface ClusterConfig {
  hardware: HardwareSpec;
  radiator: RadiatorSpec;
  chip_count: number;
  structural_mass_multiplier: number;
}

// ─── Infrastructure mass constants ────────────────────────────────────────────

// Solar panels: modern GaAs triple-junction, ~300 W/m², ~5 kg/kW
const SOLAR_KG_PER_KW = 5;

// Power distribution harness: high-voltage DC busbars + cable runs
// ~0.3 kg/kW. At 1M H100s = 700 GW → 210,000 kg in wiring alone.
const POWER_DIST_KG_PER_KW = 0.3;

// Networking interconnects: NVLink switches ~30 kg each, 1 switch per 8 chips
// InfiniBand HDR switches ~25 kg for 40-port. Assume 1 switch per 8 GPUs.
const NETWORK_SWITCH_KG_PER_CHIP = 30 / 8; // 3.75 kg/chip

// Laser comm terminals (optical inter-satellite + Earth downlink):
// Projected 2030 state-of-practice: ~1 Tbps terminal at ~50 kg.
// Bandwidth need: ~0.1 Gbps per active chip at 80% utilization.
// Scale: 0.05 kg/Gbps required bandwidth.
const LASER_BANDWIDTH_GBPS_PER_CHIP = 0.1;
const LASER_KG_PER_GBPS = 0.05;

// Repair/maintenance robots: 1 per 10,000 chips, ~500 kg each (Canadarm-class)
const ROBOT_KG = 500;
const CHIPS_PER_ROBOT = 10_000;

// Fluid cooling loops (heat pipe manifolds, pumps, flex lines):
// ~0.4 kg/kW in addition to radiator panels themselves.
const COOLING_LOOP_KG_PER_KW = 0.4;

// Attitude control + station-keeping (reaction wheels, thrusters, propellant):
// ~2% of total structural mass (approximated iteratively)
const ATTITUDE_CTRL_FRAC = 0.02;

// ─── Breakdown types ─────────────────────────────────────────────────────────

export interface InfrastructureMass {
  chips_kg: number;
  radiator_panels_kg: number;
  cooling_loops_kg: number;
  solar_power_kg: number;
  power_distribution_kg: number;
  networking_switches_kg: number;
  laser_comm_kg: number;
  repair_robots_kg: number;
  structure_kg: number;
  attitude_control_kg: number;
  shielding_kg: number; // set externally from structure-model if used
}

export interface InfrastructureCost {
  chips_usd: number;
  radiator_usd: number; // fabrication cost (separate from launch cost)
  shielding_usd: number;
  networking_usd: number;
  laser_comm_usd: number;
  repair_robots_usd: number;
  solar_power_usd: number;
  total_hardware_usd: number; // excludes launch
}

// ── Infrastructure fabrication cost constants ────────────────────────────────
// NVLink switch (NVSwitch 3.0): ~$30k each, 1 per 8 chips
const NETWORK_SWITCH_COST_USD_PER_CHIP = 30_000 / 8;
// Laser comm: $50k per Tbps terminal (projected 2030)
const LASER_COST_USD_PER_GBPS = 50;
// Repair robot: Canadarm-class ~$150M each at heritage, ~$5M near-term commercial
const ROBOT_COST_USD = 5_000_000;
// Solar panel: ~$300/W (space-grade GaAs)
const SOLAR_COST_USD_PER_KW = 300_000;

export interface PayloadBreakdown {
  infra: InfrastructureMass;
  costs: InfrastructureCost;
  solar_availability_factor: number;
  solar_panel_kw_needed: number;
  total_mass_kg: number;
  total_power_kw: number;
  compute_tflops: number;
  compute_tops: number;
  tflops_per_kg: number;
  tops_per_kg: number;
  launches_needed: (vehicle: LaunchVehicle) => number;
  launch_cost_usd: (vehicle: LaunchVehicle) => number;
  total_cost_to_orbit: (vehicle: LaunchVehicle) => number; // hardware + launch
  // legacy shims used by existing components
  chip_mass_kg: number;
  radiator_mass_kg: number;
  structure_mass_kg: number;
  power_system_mass_kg: number;
}

/**
 * solar_availability_factor: fraction of time the array can generate power.
 * LEO sun-synchronous: ~0.6 (60% illuminated, need battery buffer).
 * LEO dawn-dusk: ~0.8–0.9 (highly inclined, mostly sunlit).
 * GEO: ~0.99 (nearly always sunlit, short eclipses at equinox).
 * No atmosphere = 1.37 kW/m² vs 1.0 kW/m² on ground → panels are ~37% more effective per m².
 * Combined: space panels deliver ~2× the energy/year vs same panel on Earth (no clouds, no night, no atmosphere).
 * Default 0.6 = conservative LEO. User can raise to 0.9+ for GEO/dawn-dusk orbit.
 */
export function calcPayload(
  config: ClusterConfig,
  shielding_kg = 0,
  shielding_cost_usd = 0,
  chip_cost_usd = 0,
  solar_availability_factor = 0.6
): PayloadBreakdown {
  const { hardware, radiator, chip_count, structural_mass_multiplier } = config;

  const total_power_kw = (hardware.tdp_w * chip_count) / 1000;
  // Need more panel capacity to cover battery-buffered periods
  const solar_panel_kw_needed = total_power_kw / solar_availability_factor;

  const chips_kg = hardware.mass_kg * chip_count;
  const radiator_panels_kg = total_power_kw * radiator.specific_mass_kg_per_kw;
  const cooling_loops_kg = total_power_kw * COOLING_LOOP_KG_PER_KW;
  const solar_power_kg = solar_panel_kw_needed * SOLAR_KG_PER_KW;
  const power_distribution_kg = total_power_kw * POWER_DIST_KG_PER_KW;
  const networking_switches_kg = chip_count * NETWORK_SWITCH_KG_PER_CHIP;
  const laser_bandwidth_gbps = chip_count * LASER_BANDWIDTH_GBPS_PER_CHIP;
  const laser_comm_kg = laser_bandwidth_gbps * LASER_KG_PER_GBPS;
  const repair_robots_kg = Math.ceil(chip_count / CHIPS_PER_ROBOT) * ROBOT_KG;

  // Structure: multiplier on electronics (chips + switches + lasers)
  const electronics_kg = chips_kg + networking_switches_kg + laser_comm_kg;
  const structure_kg = electronics_kg * (structural_mass_multiplier - 1);

  // Attitude control: 2% of everything except propellant itself (approximate)
  const pre_attitude = chips_kg + radiator_panels_kg + cooling_loops_kg + solar_power_kg
    + power_distribution_kg + networking_switches_kg + laser_comm_kg
    + repair_robots_kg + structure_kg + shielding_kg;
  const attitude_control_kg = pre_attitude * ATTITUDE_CTRL_FRAC;

  const total_mass_kg = pre_attitude + attitude_control_kg;

  const compute_tflops = hardware.compute_tflops * chip_count;
  const compute_tops = (hardware.compute_tops ?? 0) * chip_count;

  const infra: InfrastructureMass = {
    chips_kg,
    radiator_panels_kg,
    cooling_loops_kg,
    solar_power_kg,
    power_distribution_kg,
    networking_switches_kg,
    laser_comm_kg,
    repair_robots_kg,
    structure_kg,
    attitude_control_kg,
    shielding_kg,
  };

  // Fabrication costs (separate from launch cost)
  const radiator_usd = total_power_kw * radiator.cost_usd_per_kw;
  const networking_usd = chip_count * NETWORK_SWITCH_COST_USD_PER_CHIP;
  const laser_comm_usd = laser_bandwidth_gbps * LASER_COST_USD_PER_GBPS;
  const repair_robots_usd = Math.ceil(chip_count / CHIPS_PER_ROBOT) * ROBOT_COST_USD;
  const solar_usd = solar_panel_kw_needed * SOLAR_COST_USD_PER_KW;
  const chips_usd = chip_cost_usd * chip_count;
  const total_hardware_usd = chips_usd + radiator_usd + networking_usd
    + laser_comm_usd + repair_robots_usd + solar_usd + shielding_cost_usd;

  const costs: InfrastructureCost = {
    chips_usd,
    radiator_usd,
    shielding_usd: shielding_cost_usd,
    networking_usd,
    laser_comm_usd,
    repair_robots_usd,
    solar_power_usd: solar_usd,
    total_hardware_usd,
  };

  return {
    infra,
    costs,
    solar_availability_factor,
    solar_panel_kw_needed,
    total_mass_kg,
    total_power_kw,
    compute_tflops,
    compute_tops,
    tflops_per_kg: compute_tflops / total_mass_kg,
    tops_per_kg: compute_tops / total_mass_kg,
    launches_needed: (v: LaunchVehicle) => Math.ceil(total_mass_kg / v.payload_to_leo_kg),
    launch_cost_usd: (v: LaunchVehicle) => total_mass_kg * v.cost_per_kg_usd,
    total_cost_to_orbit: (v: LaunchVehicle) =>
      total_hardware_usd + total_mass_kg * v.cost_per_kg_usd,
    // legacy shims
    chip_mass_kg: chips_kg,
    radiator_mass_kg: radiator_panels_kg,
    structure_mass_kg: structure_kg,
    power_system_mass_kg: solar_power_kg,
  };
}
