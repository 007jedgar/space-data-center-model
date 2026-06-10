/**
 * Physical structure sizing and radiation shielding model for a space datacenter.
 *
 * Assumptions:
 * - Chips are tiled in a dense rack approximation; each chip occupies its own volume footprint
 * - Radiator panels deploy perpendicular to the chassis (like ISS P-truss radiators)
 * - Cosmic ray shielding: aluminum equivalent depth to reduce SEU rate to near-Earth levels
 *   Standard NASA requirement: ~10 g/cm² Al equivalent for crewed; we use 5 g/cm² for
 *   hardened electronics in LEO, 20 g/cm² for unshielded COTS in deep orbit.
 * - Shielding wraps the compute volume only (not radiators)
 */

export interface StructureResult {
  // Compute volume
  chip_volume_m3: number;
  chip_footprint_m2: number; // floor area of dense chip array
  chip_array_side_m: number; // if square array

  // Radiator area already comes from thermal model — here we add depth/thickness
  radiator_panel_area_m2: number;
  radiator_panel_thickness_m: number; // ~0.02 m typical heat-pipe panel
  radiator_volume_m3: number;

  // Radiation shielding
  shield_al_thickness_mm: number; // aluminum wall thickness
  shield_mass_kg: number;
  shield_surface_area_m2: number;
  shield_cost_usd: number; // fabrication + machining cost

  // Combined structure
  total_dry_mass_estimate_kg: number;
  bounding_box_m: [number, number, number]; // W × H × D including deployed radiators
}

// Al density kg/m³
const AL_DENSITY = 2700;

// Shielding cost: aerospace-grade aluminum sheet + machining + integration
// ~$500/kg at small batch. At mass production (100,000+ kg) could fall to $50–100/kg.
// Using $300/kg as mid-range space-grade Al enclosure cost.
const SHIELD_COST_USD_PER_KG = 300;

// SEU shielding presets g/cm² → mm Al
// g/cm² * 10 / density(g/cm³) = mm
// density Al = 2.7 g/cm³ → thickness_mm = gcm2 * 10 / 2.7
function shieldingThicknessMm(gcm2: number): number {
  return (gcm2 * 10) / 2.7;
}

export type ShieldingLevel = "none" | "leo-cots" | "leo-hardened" | "geo-deep";

const SHIELDING_GCMS2: Record<ShieldingLevel, number> = {
  none: 0,
  "leo-cots": 3, // ~11 mm Al — typical commercial LEO cubesat
  "leo-hardened": 5, // ~18.5 mm Al — NASA human-rated equivalent for instruments
  "geo-deep": 20, // ~74 mm Al — GEO or deep space unshielded COTS
};

export const SHIELDING_LABELS: Record<ShieldingLevel, string> = {
  none: "None (rad-hard chips only)",
  "leo-cots": "LEO COTS (~3 g/cm² Al)",
  "leo-hardened": "LEO Hardened (~5 g/cm² Al)",
  "geo-deep": "GEO/Deep Space (~20 g/cm² Al)",
};

export function calcStructure(
  chip_count: number,
  chip_volume_l: number, // per chip
  radiator_area_m2: number,
  shielding: ShieldingLevel,
  packing_efficiency: number = 0.6 // fraction of bounding box actually filled with chips
): StructureResult {
  const chip_volume_m3 = (chip_volume_l / 1000) * chip_count;
  const dense_volume_m3 = chip_volume_m3 / packing_efficiency;

  // Assume cube-ish compute block
  const side_m = Math.cbrt(dense_volume_m3);
  const chip_footprint_m2 = side_m * side_m;

  // Radiator panels: thin flat panels
  const radiator_panel_thickness_m = 0.025;
  const radiator_volume_m3 = radiator_area_m2 * radiator_panel_thickness_m;

  // Shielding: wraps the compute cube (6 faces)
  const shield_surface_area_m2 = 6 * side_m * side_m;
  const shield_thickness_mm = shieldingThicknessMm(SHIELDING_GCMS2[shielding]);
  const shield_thickness_m = shield_thickness_mm / 1000;
  const shield_volume_m3 = shield_surface_area_m2 * shield_thickness_m;
  const shield_mass_kg = shield_volume_m3 * AL_DENSITY;

  // Bounding box: compute cube + radiator depth on two sides
  // Radiators deploy as flat panels, each side = sqrt(radiator_area_m2 / 2)
  const radiator_half_side = Math.sqrt(radiator_area_m2 / 2);
  const bounding_w = Math.max(side_m, radiator_half_side);
  const bounding_h = side_m;
  const bounding_d = side_m + 2 * radiator_panel_thickness_m + 0.5; // deploy gap

  // Very rough structural dry mass (Al truss + fasteners): ~10% of chip+radiator+shield
  const total_dry_mass_estimate_kg =
    shield_mass_kg + (chip_volume_m3 * 1000 * 0.1); // rough structural

  const shield_cost_usd = shield_mass_kg * SHIELD_COST_USD_PER_KG;

  return {
    chip_volume_m3,
    chip_footprint_m2,
    chip_array_side_m: side_m,
    radiator_panel_area_m2: radiator_area_m2,
    radiator_panel_thickness_m,
    radiator_volume_m3,
    shield_al_thickness_mm: shield_thickness_mm,
    shield_mass_kg,
    shield_surface_area_m2,
    shield_cost_usd,
    total_dry_mass_estimate_kg,
    bounding_box_m: [bounding_w, bounding_h, bounding_d],
  };
}

export interface CapexTimeline {
  year: number;
  cumulative_chips: number;
  cumulative_spend_m: number;
  cumulative_tflops: number;
  cumulative_tops: number;
  launches_to_date: number;
}

export function buildCapexTimeline(
  chip_tdp_w: number,
  chip_cost_usd: number,
  chip_mass_kg: number,
  chip_tflops: number,
  chip_tops: number,
  radiator_specific_mass_kg_per_kw: number,
  vehicle_cost_per_kg: number,
  vehicle_payload_kg: number,
  structural_multiplier: number,
  solar_kg_per_kw: number,
  annual_capex_m: number, // $M per year budget
  years: number
): CapexTimeline[] {
  // Per-chip total mass (chip + proportional radiator + solar + structure)
  const power_kw_per_chip = chip_tdp_w / 1000;
  const radiator_kg = power_kw_per_chip * radiator_specific_mass_kg_per_kw;
  const solar_kg = power_kw_per_chip * solar_kg_per_kw;
  const struct_kg = chip_mass_kg * (structural_multiplier - 1);
  const mass_per_chip_kg = chip_mass_kg + radiator_kg + solar_kg + struct_kg;

  const launch_cost_per_chip = mass_per_chip_kg * vehicle_cost_per_kg;
  const total_cost_per_chip = chip_cost_usd + launch_cost_per_chip;

  const chips_per_year = Math.floor((annual_capex_m * 1e6) / total_cost_per_chip);
  const chips_per_launch = Math.floor(vehicle_payload_kg / mass_per_chip_kg);

  const rows: CapexTimeline[] = [];
  let cum_chips = 0;
  let cum_spend = 0;
  let cum_launches = 0;

  for (let y = 1; y <= years; y++) {
    cum_chips += chips_per_year;
    cum_spend += annual_capex_m;
    cum_launches += Math.ceil(chips_per_year / chips_per_launch);
    rows.push({
      year: y,
      cumulative_chips: cum_chips,
      cumulative_spend_m: cum_spend,
      cumulative_tflops: cum_chips * chip_tflops,
      cumulative_tops: cum_chips * chip_tops,
      launches_to_date: cum_launches,
    });
  }
  return rows;
}
