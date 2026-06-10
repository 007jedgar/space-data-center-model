/**
 * Revenue model for space datacenters.
 *
 * Reference anchor (2026):
 *   200,000 NVIDIA H100-class GPUs · 300 MW capacity = $1B/month
 *   → $5,000/GPU/month = $3,333/kW/month
 *
 * Sources: SpaceX/Anthropic deal structure, CoreWeave H100 spot $2–5/hr,
 * Lambda Labs $2.49/hr H100, AWS p4d ~$3.20/hr/GPU.
 */

export const CHIP_COSTS_USD_MAP: Record<string, number> = {
  rad750: 200_000,
  "versal-ai-edge": 5_000,
  "leon4-fpga": 150_000,
  "h100-sxm5": 30_000,
  "h200-sxm5": 35_000,
  b100: 40_000,
  b200: 50_000,
  trainium2: 20_000,
};

export const REVENUE_ANCHOR = {
  gpus: 200_000,
  mw: 300,
  revenue_per_month_usd: 1_000_000_000,
} as const;

// Derived unit rates
export const REVENUE_PER_GPU_PER_MONTH = REVENUE_ANCHOR.revenue_per_month_usd / REVENUE_ANCHOR.gpus; // $5,000
export const REVENUE_PER_KW_PER_MONTH = (REVENUE_ANCHOR.revenue_per_month_usd / (REVENUE_ANCHOR.mw * 1000)); // $3,333

export interface RevenueConfig {
  name: string;
  description: string;
  gpu_count: number;
  gpu_tdp_w: number;
  revenue_multiplier: number; // vs H100 anchor (e.g. Trainium2 = 0.9 price discount)
  utilization: number; // 0–1
}

export const REVENUE_TIERS: RevenueConfig[] = [
  {
    name: "Inference Micro",
    description: "Edge inference node. 1k GPUs. Think managed AI API startup.",
    gpu_count: 1_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 1.0,
    utilization: 0.7,
  },
  {
    name: "Inference Small",
    description: "Small AI provider / enterprise. 5k GPUs.",
    gpu_count: 5_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 1.0,
    utilization: 0.75,
  },
  {
    name: "Training Medium",
    description: "GPT-4-class training cluster. 30k GPUs.",
    gpu_count: 30_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 1.05,
    utilization: 0.85,
  },
  {
    name: "Training Large",
    description: "Major AI lab scale. 100k GPUs.",
    gpu_count: 100_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 1.1,
    utilization: 0.88,
  },
  {
    name: "Hyperscale (anchor)",
    description: "SpaceX/Anthropic reference deal. 200k GPUs · 300 MW.",
    gpu_count: 200_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 1.0,
    utilization: 1.0,
  },
  {
    name: "Megacluster",
    description: "Future AGI-scale cluster. 1M GPUs · ~1.5 GW.",
    gpu_count: 1_000_000,
    gpu_tdp_w: 700,
    revenue_multiplier: 0.95, // volume discount on rack rates
    utilization: 0.9,
  },
];

// ─── Inflation & price models ─────────────────────────────────────────────────

export interface RevenueProjectionParams {
  cpi_rate: number; // annual CPI inflation, e.g. 0.03
  compute_price_deflation: number; // annual price/FLOP drop, e.g. 0.20
  demand_growth: number; // annual AI demand growth offsetting deflation, e.g. 0.30
  space_premium: number; // multiplier for orbital DC premium, e.g. 1.15 = +15%
}

export const DEFAULT_PROJECTION_PARAMS: RevenueProjectionParams = {
  cpi_rate: 0.03,
  compute_price_deflation: 0.20,
  demand_growth: 0.30,
  space_premium: 1.0,
};

export interface YearlyRevenuePoint {
  year: number;
  calendar_year: number;
  // Nominal dollars (CPI inflated only)
  nominal_monthly_revenue_m: number;
  nominal_annual_revenue_b: number;
  // Real-terms: price deflation applied (compute gets cheaper)
  real_monthly_revenue_m: number;
  real_annual_revenue_b: number;
  // Net: deflation offset by demand growth (realistic scenario)
  net_monthly_revenue_m: number;
  net_annual_revenue_b: number;
}

export function projectRevenue(
  base_monthly_revenue_usd: number,
  years: number,
  params: RevenueProjectionParams,
  base_year: number = 2026
): YearlyRevenuePoint[] {
  const rows: YearlyRevenuePoint[] = [];
  for (let y = 0; y <= years; y++) {
    const nominal = base_monthly_revenue_usd * Math.pow(1 + params.cpi_rate, y);
    const real = base_monthly_revenue_usd * Math.pow(1 - params.compute_price_deflation, y);
    const net = base_monthly_revenue_usd
      * Math.pow(1 + params.demand_growth - params.compute_price_deflation, y)
      * params.space_premium;
    rows.push({
      year: y,
      calendar_year: base_year + y,
      nominal_monthly_revenue_m: nominal / 1e6,
      nominal_annual_revenue_b: (nominal * 12) / 1e9,
      real_monthly_revenue_m: real / 1e6,
      real_annual_revenue_b: (real * 12) / 1e9,
      net_monthly_revenue_m: net / 1e6,
      net_annual_revenue_b: (net * 12) / 1e9,
    });
  }
  return rows;
}

export interface PaybackResult {
  capex_total_m: number;
  monthly_revenue_m: number;
  annual_revenue_m: number;
  payback_months: number;
  payback_years: number;
  roi_5yr_pct: number;
  roi_10yr_pct: number;
  npv_10yr_b: number; // at 10% discount rate
}

export function calcPayback(
  capex_total_usd: number,
  monthly_revenue_usd: number,
  annual_opex_usd: number = 0
): PaybackResult {
  const annual_net = monthly_revenue_usd * 12 - annual_opex_usd;
  const payback_months = annual_opex_usd > 0
    ? (capex_total_usd / (monthly_revenue_usd - annual_opex_usd / 12))
    : (capex_total_usd / monthly_revenue_usd);

  const DISCOUNT_RATE = 0.10;
  let npv = -capex_total_usd;
  for (let y = 1; y <= 10; y++) {
    npv += annual_net / Math.pow(1 + DISCOUNT_RATE, y);
  }

  return {
    capex_total_m: capex_total_usd / 1e6,
    monthly_revenue_m: monthly_revenue_usd / 1e6,
    annual_revenue_m: (monthly_revenue_usd * 12) / 1e6,
    payback_months: Math.max(0, payback_months),
    payback_years: Math.max(0, payback_months / 12),
    roi_5yr_pct: ((annual_net * 5 - capex_total_usd) / capex_total_usd) * 100,
    roi_10yr_pct: ((annual_net * 10 - capex_total_usd) / capex_total_usd) * 100,
    npv_10yr_b: npv / 1e9,
  };
}
