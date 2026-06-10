/**
 * Stefan-Boltzmann radiative heat rejection model for space.
 *
 * In space: no convection, no conduction to ambient.
 * Only mechanism: thermal radiation.
 *   P = ε · σ · A · (T_rad⁴ - T_space⁴)
 *
 * T_space ≈ 3.5 K effective (CMB + solar, eclipse-side LEO)
 * σ = 5.670374419 × 10⁻⁸ W/(m²·K⁴)
 */

const STEFAN_BOLTZMANN = 5.670374419e-8; // W/(m²·K⁴)
const T_SPACE_K = 3.5; // effective background (eclipse)
const T_SPACE_SUNLIT_K = 200; // sunlit side worst-case absorbed solar

export interface ThermalResult {
  power_rejected_w: number;
  radiator_area_m2: number;
  radiator_mass_kg: number;
  radiator_area_m2_per_chip: number;
  radiator_mass_kg_per_chip: number;
  total_radiator_mass_for_cluster_kg: number;
  chip_count: number;
}

export function calcRadiatorRequirements(
  heat_load_w: number,
  radiator_temp_k: number,
  emissivity: number,
  specific_mass_kg_per_kw: number,
  chip_count: number = 1,
  sunlit: boolean = false
): ThermalResult {
  const t_env = sunlit ? T_SPACE_SUNLIT_K : T_SPACE_K;
  const total_heat_w = heat_load_w * chip_count;

  // Area needed: A = P / (ε·σ·(T_rad⁴ - T_env⁴))
  const delta = emissivity * STEFAN_BOLTZMANN * (Math.pow(radiator_temp_k, 4) - Math.pow(t_env, 4));
  const area_m2 = total_heat_w / delta;

  const mass_kg = (total_heat_w / 1000) * specific_mass_kg_per_kw;

  return {
    power_rejected_w: total_heat_w,
    radiator_area_m2: area_m2,
    radiator_mass_kg: mass_kg,
    radiator_area_m2_per_chip: area_m2 / chip_count,
    radiator_mass_kg_per_chip: mass_kg / chip_count,
    total_radiator_mass_for_cluster_kg: mass_kg,
    chip_count,
  };
}

export interface ScalePoint {
  chip_count: number;
  total_tdp_kw: number;
  radiator_area_m2: number;
  radiator_mass_kg: number;
  equivalent_iss_solar_arrays: number; // ISS has 2500 m² arrays
  equivalent_football_fields: number;
}

// ISS radiator total area ~1600 m² (not solar arrays, actual radiators)
const ISS_RADIATOR_AREA_M2 = 1600;
const ISS_SOLAR_ARRAY_AREA_M2 = 2500;
const FOOTBALL_FIELD_M2 = 5351;

export function buildScaleCurve(
  tdp_per_chip_w: number,
  radiator_temp_k: number,
  emissivity: number,
  specific_mass_kg_per_kw: number,
  chip_counts: number[]
): ScalePoint[] {
  return chip_counts.map((n) => {
    const result = calcRadiatorRequirements(
      tdp_per_chip_w,
      radiator_temp_k,
      emissivity,
      specific_mass_kg_per_kw,
      n,
      false
    );
    return {
      chip_count: n,
      total_tdp_kw: (tdp_per_chip_w * n) / 1000,
      radiator_area_m2: result.radiator_area_m2,
      radiator_mass_kg: result.radiator_mass_kg,
      equivalent_iss_solar_arrays: result.radiator_area_m2 / ISS_SOLAR_ARRAY_AREA_M2,
      equivalent_football_fields: result.radiator_area_m2 / FOOTBALL_FIELD_M2,
    };
  });
}

export interface PowerEfficiency {
  tops_per_watt: number;
  tflops_per_watt: number;
  w_per_tops: number;
}

export function calcEfficiency(tdp_w: number, tops: number, tflops: number): PowerEfficiency {
  return {
    tops_per_watt: tops / tdp_w,
    tflops_per_watt: tflops / tdp_w,
    w_per_tops: tdp_w / tops,
  };
}
