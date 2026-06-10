/**
 * Earth datacenter TCO model.
 *
 * CapEx:
 *   - Construction (shell + power infra + cooling): $/MW
 *   - GPU hardware (same as space)
 *   - Network/interconnect (included in construction estimate)
 *
 * Annual OpEx:
 *   - Electricity: power_kw × 8760 h × PUE × $/kWh
 *   - Water (cooling): power_kw × 8760 × WUE gal/kWh × $/gal
 *   - Land: $/acre/yr × acres (or amortized purchase)
 *   - Labor: $/employee × headcount (scales sub-linearly with size)
 *   - Maintenance: % of construction CapEx/yr
 *   - Permits/taxes/compliance: % of construction CapEx/yr
 */

export interface EarthDCLocation {
  id: string;
  name: string;
  electricity_usd_per_kwh: number;
  water_usd_per_gallon: number;
  land_usd_per_acre_per_yr: number; // leased land
  labor_cost_multiplier: number; // 1.0 = US avg ($95k/employee/yr)
  construction_usd_per_mw: number; // shell + MEP + cooling + power infra
  renewable_pct: number; // for display/ESG purposes
  notes: string;
}

export const EARTH_LOCATIONS: EarthDCLocation[] = [
  {
    id: "us-avg",
    name: "US Average",
    electricity_usd_per_kwh: 0.07,
    water_usd_per_gallon: 0.003,
    land_usd_per_acre_per_yr: 15_000,
    labor_cost_multiplier: 1.0,
    construction_usd_per_mw: 8_000_000,
    renewable_pct: 0.25,
    notes: "Typical US commercial rate. PJM/MISO grid mix.",
  },
  {
    id: "texas",
    name: "Texas (ERCOT cheap power)",
    electricity_usd_per_kwh: 0.04,
    water_usd_per_gallon: 0.002,
    land_usd_per_acre_per_yr: 5_000,
    labor_cost_multiplier: 0.9,
    construction_usd_per_mw: 7_000_000,
    renewable_pct: 0.40,
    notes: "West Texas wind + cheap land. Risk: grid instability.",
  },
  {
    id: "pnw",
    name: "Pacific Northwest (Hydro)",
    electricity_usd_per_kwh: 0.03,
    water_usd_per_gallon: 0.001,
    land_usd_per_acre_per_yr: 8_000,
    labor_cost_multiplier: 1.1,
    construction_usd_per_mw: 9_000_000,
    renewable_pct: 0.90,
    notes: "Columbia River hydro. Near-zero marginal power cost.",
  },
  {
    id: "california",
    name: "California (Premium)",
    electricity_usd_per_kwh: 0.18,
    water_usd_per_gallon: 0.008,
    land_usd_per_acre_per_yr: 120_000,
    labor_cost_multiplier: 1.6,
    construction_usd_per_mw: 15_000_000,
    renewable_pct: 0.55,
    notes: "High cost of everything. Regulatory overhead. Near tech talent.",
  },
  {
    id: "eu-avg",
    name: "EU Average",
    electricity_usd_per_kwh: 0.12,
    water_usd_per_gallon: 0.004,
    land_usd_per_acre_per_yr: 25_000,
    labor_cost_multiplier: 1.15,
    construction_usd_per_mw: 10_000_000,
    renewable_pct: 0.45,
    notes: "Avg across DE/FR/NL. High power post-2022 energy crisis.",
  },
  {
    id: "iceland",
    name: "Iceland / Nordics (Renewables)",
    electricity_usd_per_kwh: 0.03,
    water_usd_per_gallon: 0.0005,
    land_usd_per_acre_per_yr: 3_000,
    labor_cost_multiplier: 1.2,
    construction_usd_per_mw: 11_000_000,
    renewable_pct: 1.0,
    notes: "Geothermal + hydro. Natural air cooling. High construction cost.",
  },
  {
    id: "virginia",
    name: "Northern Virginia (Data Center Alley)",
    electricity_usd_per_kwh: 0.065,
    water_usd_per_gallon: 0.003,
    land_usd_per_acre_per_yr: 40_000,
    labor_cost_multiplier: 1.1,
    construction_usd_per_mw: 8_500_000,
    renewable_pct: 0.30,
    notes: "Most dense DC market globally. Land getting scarce & expensive.",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS_PER_YEAR = 8_760;
const US_AVG_LABOR_USD_PER_EMPLOYEE = 95_000;
const BASE_EMPLOYEES_PER_1000_CHIPS = 0.05; // ~50 staff per 1M GPUs (very automated)
const MIN_EMPLOYEES = 25; // floor regardless of size
const PUE = 1.3; // Power Usage Effectiveness (IT load × PUE = total facility power)
const WUE_GAL_PER_KWH = 1.5; // Water Usage Effectiveness (gallons per kWh IT)
const DC_FOOTPRINT_ACRES_PER_MW = 0.5; // typical hyperscale: ~2 MW/acre
const MAINTENANCE_PCT_OF_CONSTRUCTION = 0.02; // 2%/yr
const PERMITS_COMPLIANCE_PCT = 0.005; // 0.5%/yr of construction

export interface EarthDCCapex {
  construction_usd: number; // shell + power + cooling infra
  hardware_usd: number; // GPUs
  total_usd: number;
  construction_per_mw_usd: number;
}

export interface EarthDCOpex {
  electricity_usd_per_yr: number;
  water_usd_per_yr: number;
  land_usd_per_yr: number;
  labor_usd_per_yr: number;
  maintenance_usd_per_yr: number;
  permits_compliance_usd_per_yr: number;
  total_usd_per_yr: number;
}

export interface EarthDCResult {
  location: EarthDCLocation;
  chip_count: number;
  tdp_kw_total: number;
  facility_power_kw: number; // IT + overhead via PUE
  capex: EarthDCCapex;
  opex: EarthDCOpex;
  tco_5yr_usd: number;
  tco_10yr_usd: number;
  opex_per_gpu_per_month_usd: number;
  capex_per_gpu_usd: number;
  employees: number;
  water_gallons_per_yr: number;
  dc_footprint_acres: number;
}

export function calcEarthDC(
  chip_count: number,
  tdp_per_chip_w: number,
  chip_cost_usd: number,
  location: EarthDCLocation
): EarthDCResult {
  const tdp_kw = (tdp_per_chip_w * chip_count) / 1000;
  const facility_power_kw = tdp_kw * PUE;
  const facility_power_mw = facility_power_kw / 1000;

  // CapEx
  const construction_usd = facility_power_mw * location.construction_usd_per_mw;
  const hardware_usd = chip_count * chip_cost_usd;
  const capex: EarthDCCapex = {
    construction_usd,
    hardware_usd,
    total_usd: construction_usd + hardware_usd,
    construction_per_mw_usd: location.construction_usd_per_mw,
  };

  // Labor
  const employees = Math.max(
    MIN_EMPLOYEES,
    Math.round(chip_count * BASE_EMPLOYEES_PER_1000_CHIPS / 1000)
  );
  const labor_usd_per_yr = employees * US_AVG_LABOR_USD_PER_EMPLOYEE * location.labor_cost_multiplier;

  // Power
  const electricity_usd_per_yr = facility_power_kw * HOURS_PER_YEAR * location.electricity_usd_per_kwh;

  // Water
  const water_gallons_per_yr = tdp_kw * HOURS_PER_YEAR * WUE_GAL_PER_KWH;
  const water_usd_per_yr = water_gallons_per_yr * location.water_usd_per_gallon;

  // Land
  const dc_footprint_acres = facility_power_mw * DC_FOOTPRINT_ACRES_PER_MW;
  const land_usd_per_yr = dc_footprint_acres * location.land_usd_per_acre_per_yr;

  // Maintenance + compliance
  const maintenance_usd_per_yr = construction_usd * MAINTENANCE_PCT_OF_CONSTRUCTION;
  const permits_compliance_usd_per_yr = construction_usd * PERMITS_COMPLIANCE_PCT;

  const total_opex = electricity_usd_per_yr + water_usd_per_yr + land_usd_per_yr
    + labor_usd_per_yr + maintenance_usd_per_yr + permits_compliance_usd_per_yr;

  const opex: EarthDCOpex = {
    electricity_usd_per_yr,
    water_usd_per_yr,
    land_usd_per_yr,
    labor_usd_per_yr,
    maintenance_usd_per_yr,
    permits_compliance_usd_per_yr,
    total_usd_per_yr: total_opex,
  };

  return {
    location,
    chip_count,
    tdp_kw_total: tdp_kw,
    facility_power_kw,
    capex,
    opex,
    tco_5yr_usd: capex.total_usd + total_opex * 5,
    tco_10yr_usd: capex.total_usd + total_opex * 10,
    opex_per_gpu_per_month_usd: total_opex / chip_count / 12,
    capex_per_gpu_usd: capex.total_usd / chip_count,
    employees,
    water_gallons_per_yr,
    dc_footprint_acres,
  };
}

// ─── Real-world datacenter reference examples ────────────────────────────────

export interface RealDCExample {
  name: string;
  operator: string;
  location: string;
  capacity_mw: number;
  capex_investment_b: number; // reported investment $B
  employees_onsite: number;
  gpu_count_estimate?: number;
  annual_revenue_b?: number; // where publicly known
  pue?: number;
  land_acres?: number;
  water_mgal_per_yr?: number; // million gallons/yr
  opened_year?: number;
  source: string;
  notes: string;
}

export const REAL_DC_EXAMPLES: RealDCExample[] = [
  {
    name: "Stargate Phase 1 (Abilene, TX)",
    operator: "OpenAI / Microsoft / Oracle",
    location: "Abilene, Texas",
    capacity_mw: 200,
    capex_investment_b: 11.6,
    employees_onsite: 600,
    gpu_count_estimate: 100_000,
    pue: 1.2,
    land_acres: 1_200,
    opened_year: 2025,
    source: "WSJ Jan 2025 announcement; Microsoft SEC filings",
    notes: "$500B 4-year total Stargate program. Phase 1 = 200 MW, 10 buildings.",
  },
  {
    name: "Meta AI Data Center (DeKalb, IL)",
    operator: "Meta",
    location: "DeKalb, Illinois",
    capacity_mw: 800,
    capex_investment_b: 10,
    employees_onsite: 100,
    gpu_count_estimate: 350_000,
    pue: 1.1,
    land_acres: 2_600,
    opened_year: 2026,
    source: "Meta 2024 earnings; DeKalb County planning docs",
    notes: "Largest single Meta DC campus. Primarily H100/H200 for Llama training.",
  },
  {
    name: "Google The Dalles (Oregon)",
    operator: "Google",
    location: "The Dalles, Oregon",
    capacity_mw: 150,
    capex_investment_b: 3.2,
    employees_onsite: 200,
    pue: 1.1,
    land_acres: 190,
    water_mgal_per_yr: 1_000,
    opened_year: 2006,
    source: "Google Environmental Report 2023; The Dalles Chronicle",
    notes: "Evaporative cooling. Columbia River basin water rights controversy. Hydro power.",
  },
  {
    name: "Microsoft Iowa Campus (West Des Moines)",
    operator: "Microsoft",
    location: "West Des Moines, Iowa",
    capacity_mw: 500,
    capex_investment_b: 5,
    employees_onsite: 150,
    pue: 1.18,
    land_acres: 1_100,
    opened_year: 2020,
    source: "Iowa Economic Development Authority; Microsoft blog 2022",
    notes: "Azure hyperscale. Wind power PPAs. Expanding to ~800 MW by 2027.",
  },
  {
    name: "CoreWeave NJ (GPU Cloud)",
    operator: "CoreWeave",
    location: "Secaucus, New Jersey",
    capacity_mw: 30,
    capex_investment_b: 0.4,
    employees_onsite: 80,
    gpu_count_estimate: 10_000,
    annual_revenue_b: 1.9,
    pue: 1.35,
    land_acres: 12,
    opened_year: 2022,
    source: "CoreWeave S-1 filing March 2025; Bloomberg",
    notes: "GPU-as-a-service model. $1.9B revenue 2024 from ~35k H100s across all sites.",
  },
  {
    name: "Amazon Ashburn Cluster (us-east-1)",
    operator: "Amazon Web Services",
    location: "Ashburn / Northern Virginia",
    capacity_mw: 2_000,
    capex_investment_b: 35,
    employees_onsite: 2_000,
    annual_revenue_b: 25,
    pue: 1.15,
    land_acres: 8_000,
    opened_year: 2006,
    source: "AWS re:Invent 2024; Loudoun County economic reports; AWS Annual Report 2024",
    notes: "us-east-1 = 15+ DCs. ~40% of all internet traffic routes through this region.",
  },
  {
    name: "Apple Maiden, NC",
    operator: "Apple",
    location: "Maiden, North Carolina",
    capacity_mw: 20,
    capex_investment_b: 1,
    employees_onsite: 50,
    pue: 1.2,
    land_acres: 500,
    water_mgal_per_yr: 180,
    opened_year: 2012,
    source: "Apple Environmental Progress Report 2023; NC utilities filings",
    notes: "100% renewable. iCloud + Siri backend. On-site solar + fuel cells.",
  },
];

export function calcTCOOverTime(
  earth: EarthDCResult,
  space_capex_usd: number,
  space_annual_opex_usd: number,
  years: number
): Array<{ year: number; earth_tco_b: number; space_tco_b: number; earth_ahead_b: number }> {
  const earth_opex = earth.opex.total_usd_per_yr;
  const rows = [];
  for (let y = 0; y <= years; y++) {
    const earth_tco = earth.capex.total_usd + earth_opex * y;
    const space_tco = space_capex_usd + space_annual_opex_usd * y;
    rows.push({
      year: 2026 + y,
      earth_tco_b: parseFloat((earth_tco / 1e9).toFixed(2)),
      space_tco_b: parseFloat((space_tco / 1e9).toFixed(2)),
      earth_ahead_b: parseFloat(((earth_tco - space_tco) / 1e9).toFixed(2)),
    });
  }
  return rows;
}
