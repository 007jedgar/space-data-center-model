export interface GlossaryEntry {
  term: string;
  full: string;
  definition: string;
  category: "financial" | "compute" | "thermal" | "space" | "datacenter" | "units";
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Financial ────────────────────────────────────────────────────────────────
  { term: "TCO", full: "Total Cost of Ownership", category: "financial",
    definition: "All costs over a time period: upfront CapEx plus ongoing OpEx. Used to compare space vs earth DC over N years." },
  { term: "CapEx", full: "Capital Expenditure", category: "financial",
    definition: "One-time upfront investment: hardware purchase, construction, or launch cost." },
  { term: "OpEx", full: "Operating Expenditure", category: "financial",
    definition: "Recurring annual costs: electricity, water, labor, maintenance, insurance." },
  { term: "NPV", full: "Net Present Value", category: "financial",
    definition: "Future cash flows discounted back to today's dollars at a given rate (10% used here). Positive NPV = profitable project." },
  { term: "ROI", full: "Return on Investment", category: "financial",
    definition: "(Revenue − Costs) / Cost × 100%. 5yr ROI and 10yr ROI shown in revenue table." },
  { term: "CPI", full: "Consumer Price Index", category: "financial",
    definition: "Measure of general inflation. Used to inflate nominal revenue in future years (default 3%/yr)." },
  { term: "COGS", full: "Cost of Goods Sold", category: "financial",
    definition: "Direct cost to deliver a service. For GPU clouds: mainly electricity + depreciation." },

  // ── Compute ──────────────────────────────────────────────────────────────────
  { term: "TOPS", full: "Tera Operations Per Second", category: "compute",
    definition: "10¹² integer or mixed-precision ops/second. Key metric for AI inference (INT8/FP8). H100 = 3,958 TOPS INT8." },
  { term: "TFLOPS", full: "Tera Floating-Point Operations Per Second", category: "compute",
    definition: "10¹² 32-bit floating-point ops/second. Used for training workloads. H100 = 60 TFLOPS FP32." },
  { term: "FP32", full: "32-bit Floating Point", category: "compute",
    definition: "Standard precision for training. Each number takes 4 bytes. Slower but more accurate than FP16/BF16." },
  { term: "BF16", full: "Brain Float 16", category: "compute",
    definition: "16-bit format with same exponent range as FP32. Preferred for ML training (Google Brain origin). ~2× throughput vs FP32." },
  { term: "INT8", full: "8-bit Integer", category: "compute",
    definition: "Quantized inference format. ~4× throughput vs FP32 on modern GPUs. Slight accuracy loss vs FP32." },
  { term: "TDP", full: "Thermal Design Power", category: "compute",
    definition: "Maximum sustained power (watts) a chip is rated to dissipate under full load. Equals heat that must be rejected." },
  { term: "HBM", full: "High Bandwidth Memory", category: "compute",
    definition: "3D-stacked DRAM mounted directly on GPU package. HBM3e (H200): 4,800 GB/s. Critical for LLM inference (memory-bound)." },
  { term: "NVLink", full: "NVIDIA NVLink Interconnect", category: "compute",
    definition: "High-speed GPU-to-GPU interconnect. NVLink 4.0 (H100): 900 GB/s bidirectional. Enables multi-GPU tensor parallelism." },
  { term: "ACAP", full: "Adaptive Compute Acceleration Platform", category: "compute",
    definition: "AMD's heterogeneous chip class (AI engine + FPGA + CPU + memory). Used in AMD Versal series for edge/satellite AI." },

  // ── Thermal ──────────────────────────────────────────────────────────────────
  { term: "PUE", full: "Power Usage Effectiveness", category: "thermal",
    definition: "Total facility power / IT load power. PUE 1.0 = perfect (impossible). Hyperscale: 1.1–1.2. Global avg: ~1.58. Space DC: effectively 1.0 (no HVAC)." },
  { term: "WUE", full: "Water Usage Effectiveness", category: "thermal",
    definition: "Liters of water consumed per kWh of IT load. Hyperscale average: ~1.5 L/kWh. Space: 0." },
  { term: "SEU", full: "Single Event Upset", category: "thermal",
    definition: "Bit-flip in memory/logic caused by cosmic ray or solar particle. Increases with altitude. Drives shielding requirements." },
  { term: "ε", full: "Emissivity", category: "thermal",
    definition: "Fraction of maximum possible thermal radiation emitted (0–1). Space radiator panels: 0.85–0.95. Higher = more efficient heat rejection." },

  // ── Space ────────────────────────────────────────────────────────────────────
  { term: "LEO", full: "Low Earth Orbit", category: "space",
    definition: "160–2,000 km altitude. Lower radiation than MEO/GEO. ~90-min orbital period. Starlink, ISS orbit here." },
  { term: "MEO", full: "Medium Earth Orbit", category: "space",
    definition: "2,000–35,786 km altitude. High radiation (Van Allen belts). GPS satellites orbit here. Harsher for electronics." },
  { term: "GEO", full: "Geostationary Earth Orbit", category: "space",
    definition: "35,786 km. Satellite appears stationary over one point. High latency (~240 ms RTT). Requires much heavier shielding than LEO." },
  { term: "ISS", full: "International Space Station", category: "space",
    definition: "420,000 kg, LEO ~400 km. 1,600 m² radiator area, ~420 kW heat rejection. Primary scale reference for this model." },
  { term: "OISL", full: "Optical Inter-Satellite Link", category: "space",
    definition: "Laser link between satellites. SpaceX Starlink: ~100 Gbps per link at ~10 kg/terminal. Used for inter-DC and Earth downlink." },
  { term: "SEP", full: "Solar Electric Propulsion", category: "space",
    definition: "Ion thrusters powered by solar panels. Used for orbital station-keeping and debris avoidance. Low thrust, high efficiency (Isp ~3000s)." },
  { term: "TRL", full: "Technology Readiness Level", category: "space",
    definition: "NASA 1–9 scale. TRL 9 = flight proven. TRL 1 = concept only. Spray-membrane radiators: TRL 3–4. Loop heat pipes: TRL 9." },

  // ── Datacenter ───────────────────────────────────────────────────────────────
  { term: "Colocation", full: "Colocation (Colo)", category: "datacenter",
    definition: "Renting space + power + cooling in a shared DC. Operator provides facility; tenant provides servers. Typical rate: $100–250/kW/month." },
  { term: "GPU-as-a-Service", full: "GPU-as-a-Service (GaaS)", category: "datacenter",
    definition: "Renting GPU compute by the hour. H100: $2–5/hr spot, $2–3/hr reserved. Revenue anchor: $5k/GPU/month = ~$6.85/hr." },
  { term: "PPA", full: "Power Purchase Agreement", category: "datacenter",
    definition: "Long-term contract to buy electricity at fixed price. DCs use PPAs to lock in cheap renewable rates (e.g. $0.03–0.05/kWh for hydro/wind)." },

  // ── Units ────────────────────────────────────────────────────────────────────
  { term: "MW", full: "Megawatt (10⁶ watts)", category: "units",
    definition: "Standard unit for datacenter capacity. 1 MW ≈ 1,400 H100 GPUs at full load (700W TDP)." },
  { term: "GW", full: "Gigawatt (10⁹ watts)", category: "units",
    definition: "1,000 MW. US average grid: ~450 GW. 1M H100s = 700 GW TDP — 1.5× the entire US grid." },
  { term: "t (metric ton)", full: "Metric tonne (1,000 kg)", category: "units",
    definition: "Used for launch payload mass. ISS = 420 t. One Starship payload capacity: 150 t." },
  { term: "g/cm²", full: "Grams per square centimeter", category: "units",
    definition: "Radiation shielding depth unit. 5 g/cm² Al ≈ 18.5 mm thick aluminum wall." },
  { term: "kg/kW", full: "Kilograms per kilowatt", category: "units",
    definition: "Specific mass of a power or thermal system. Lower = better. Loop heat pipe radiator: 5 kg/kW. Solar panels: 5 kg/kW." },
];

export const GLOSSARY_MAP = Object.fromEntries(GLOSSARY.map((g) => [g.term, g]));
