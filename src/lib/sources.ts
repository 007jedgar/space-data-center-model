export interface Source {
  id: string;
  category: string;
  title: string;
  description: string;
  url?: string;
  year: number;
}

export const SOURCES: Source[] = [
  // ── Revenue / Deal ──────────────────────────────────────────────────────────
  {
    id: "spacex-anthropic",
    category: "Revenue Anchor",
    title: "SpaceX / Anthropic AI Infrastructure Deal",
    description: "200,000 H100-class GPUs · ~300 MW · ~$1B/month. Used as revenue anchor for all GPU-as-a-service pricing in this model.",
    year: 2026,
  },
  {
    id: "coreweave-s1",
    category: "Revenue / GPU Pricing",
    title: "CoreWeave S-1 IPO Filing",
    description: "$1.9B revenue 2024 from ~35k H100s. Implies ~$4,500–5,500/GPU/month at high utilization. H100 spot: $2–3/hr.",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=CoreWeave",
    year: 2025,
  },
  {
    id: "lambda-pricing",
    category: "Revenue / GPU Pricing",
    title: "Lambda Labs H100 Pricing",
    description: "H100 SXM5 on-demand at $2.49/hr = ~$1,800/GPU/month. Used as floor for GPU-as-a-service rate.",
    url: "https://lambdalabs.com/service/gpu-cloud",
    year: 2025,
  },

  // ── Hardware Specs ───────────────────────────────────────────────────────────
  {
    id: "h100-spec",
    category: "Hardware",
    title: "NVIDIA H100 SXM5 Datasheet",
    description: "700W TDP, 3958 TOPS INT8, 60 TFLOPS FP32, 3350 GB/s HBM2e bandwidth, 4nm TSMC, 2.4 kg.",
    url: "https://www.nvidia.com/en-us/data-center/h100/",
    year: 2023,
  },
  {
    id: "h200-spec",
    category: "Hardware",
    title: "NVIDIA H200 SXM5 Datasheet",
    description: "H100 die + HBM3e 141 GB at 4800 GB/s. Same 700W TDP. Primarily memory bandwidth improvement.",
    url: "https://www.nvidia.com/en-us/data-center/h200/",
    year: 2024,
  },
  {
    id: "b100-spec",
    category: "Hardware",
    title: "NVIDIA B100/B200 Blackwell Architecture",
    description: "B100: 700W, 148 TFLOPS FP32, 14k TOPS INT4. B200: 1000W, 158 TFLOPS FP32, 20k TOPS INT4. TSMC 4NP.",
    url: "https://www.nvidia.com/en-us/data-center/blackwell/",
    year: 2024,
  },
  {
    id: "trainium2-spec",
    category: "Hardware",
    title: "AWS Trainium2 (Trn2) Technical Specifications",
    description: "190 TFLOPS BF16, ~3800 TOPS INT8 (est.), 700W TDP, HBM2e 96 GB, 5760 GB/s bandwidth, TSMC 5nm. 65% better price-perf vs H100 per AWS.",
    url: "https://aws.amazon.com/machine-learning/trainium/",
    year: 2024,
  },
  {
    id: "rad750-spec",
    category: "Hardware",
    title: "BAE Systems RAD750 Flight Computer",
    description: "PowerPC 750 derivative. ~400 MIPS, 5W TDP, 0.6 kg, 250nm rad-hard. Used on MRO, Curiosity, Kepler, JWST.",
    url: "https://www.baesystems.com/en-us/product/rad750",
    year: 2001,
  },
  {
    id: "versal-spec",
    category: "Hardware",
    title: "AMD Versal AI Edge Series Datasheet",
    description: "ACAP architecture, 7nm TSMC, ~4 TOPS AI engine, 25W TDP, 58 GB/s bandwidth. Used in commercial LEO satellites (COTS + shielding).",
    url: "https://www.amd.com/en/products/adaptive-socs-and-fpgas/versal/ai-edge-series.html",
    year: 2022,
  },
  {
    id: "leon4-spec",
    category: "Hardware",
    title: "ESA LEON4 / GR740 Processor",
    description: "Quad-core SPARC V8, 130nm rad-hard, 4W TDP, 0.1 kg. ESA standard flight processor for science missions.",
    url: "https://www.gaisler.com/index.php/products/processors/gr740",
    year: 2016,
  },

  // ── Thermal Physics ──────────────────────────────────────────────────────────
  {
    id: "stefan-boltzmann",
    category: "Thermal Model",
    title: "Stefan-Boltzmann Law",
    description: "P = ε·σ·A·(T⁴ - T_env⁴). σ = 5.670374419×10⁻⁸ W/(m²·K⁴). T_space ≈ 3.5 K effective (eclipse, LEO). Used for all radiator area calculations.",
    year: 1884,
  },
  {
    id: "iss-radiators",
    category: "Thermal Model",
    title: "ISS External Thermal Control System",
    description: "6 radiator panels, total ~1,600 m², reject ~70 kW each = ~420 kW total. Reference for radiator scale comparison.",
    url: "https://www.nasa.gov/reference/the-international-space-station/",
    year: 2023,
  },
  {
    id: "nasa-radiator",
    category: "Thermal Model",
    title: "NASA AFRL Advanced Heat Pipe Radiator Program",
    description: "Target specific mass 3 kg/kW for near-term systems. Advanced spray/membrane tech projected at 1.5 kg/kW.",
    url: "https://ntrs.nasa.gov/",
    year: 2022,
  },

  // ── Radiation Shielding ──────────────────────────────────────────────────────
  {
    id: "nasa-sp8013",
    category: "Radiation Shielding",
    title: "NASA SP-8013: Meteoroid Environment Model",
    description: "Al-equivalent shielding depths: 3 g/cm² LEO COTS, 5 g/cm² LEO hardened, 20 g/cm² GEO/deep. Aluminum density 2.7 g/cm³.",
    url: "https://ntrs.nasa.gov/citations/19690015572",
    year: 1969,
  },

  // ── Launch Vehicles ──────────────────────────────────────────────────────────
  {
    id: "starship-cost",
    category: "Launch",
    title: "SpaceX Starship Payload & Cost Projections",
    description: "150,000 kg to LEO (fully reusable). Target $100/kg with full reuse. Falcon 9: 22,800 kg LEO at $2,700/kg. Current operational 2024.",
    url: "https://www.spacex.com/vehicles/starship/",
    year: 2024,
  },
  {
    id: "new-glenn-cost",
    category: "Launch",
    title: "Blue Origin New Glenn",
    description: "45,000 kg to LEO, ~$2,200/kg estimated. First successful orbital flight Jan 2025.",
    url: "https://www.blueorigin.com/new-glenn",
    year: 2025,
  },

  // ── Earth DC Industry Data ───────────────────────────────────────────────────
  {
    id: "uptime-institute-pue",
    category: "Earth Datacenter",
    title: "Uptime Institute Global Data Center Survey 2024",
    description: "Average global PUE: 1.58. Hyperscale: 1.10–1.20. Target best practice: ≤1.2. WUE average: 1.8 L/kWh.",
    url: "https://uptimeinstitute.com/resources/research-and-reports/",
    year: 2024,
  },
  {
    id: "dc-construction-costs",
    category: "Earth Datacenter",
    title: "JLL Data Center Construction Outlook 2024",
    description: "Hyperscale construction: $7–15M/MW all-in. Northern Virginia premium: $12–15M/MW. Construction costs up 40% since 2020.",
    url: "https://www.jll.com/en/trends-and-insights/research/data-center-outlook",
    year: 2024,
  },
  {
    id: "dc-power-costs",
    category: "Earth Datacenter",
    title: "EIA Commercial Electricity Rates 2025",
    description: "US avg commercial: $0.1231/kWh. Texas: $0.07–0.09/kWh. Pacific NW hydro: $0.03–0.05/kWh. CA: $0.18–0.24/kWh.",
    url: "https://www.eia.gov/electricity/monthly/",
    year: 2025,
  },
  {
    id: "dc-water-usage",
    category: "Earth Datacenter",
    title: "Lawrence Berkeley National Lab: Datacenter Water Usage",
    description: "US datacenters used 660 billion liters of water in 2023. Average WUE 1.5 gal/kWh. Google 2023: 5.1B gallons total.",
    url: "https://eta.lbl.gov/publications/united-states-data-center-energy",
    year: 2024,
  },
  {
    id: "stargate-announcement",
    category: "Earth Datacenter",
    title: "Stargate AI Infrastructure Announcement",
    description: "$500B 4-year program. Phase 1: Abilene TX, 200 MW, 10 buildings, ~100k GPUs, $11.6B. OpenAI + Microsoft + Oracle + SoftBank.",
    url: "https://openai.com/index/announcing-the-stargate-project/",
    year: 2025,
  },
  {
    id: "meta-dekalb",
    category: "Earth Datacenter",
    title: "Meta DeKalb, IL AI Datacenter",
    description: "800 MW campus, $10B+ investment, ~350k H100/H200 GPUs for Llama training. Largest single Meta DC. 2,600 acres.",
    url: "https://about.fb.com/news/2024/01/meta-ai-infrastructure/",
    year: 2024,
  },

  // ── Industry Benchmarks ───────────────────────────────────────────────────────
  {
    id: "ai-compute-demand",
    category: "Market",
    title: "Epoch AI: Compute Used in AI Training",
    description: "AI training compute doubling every ~6 months 2020–2024 (3–5× annual growth). GPT-4: ~3×10²⁵ FLOP. Llama 3 70B: ~6×10²⁴ FLOP.",
    url: "https://epochai.org/trends",
    year: 2024,
  },
  {
    id: "gpu-price-deflation",
    category: "Market",
    title: "Historical GPU Compute Price Trends",
    description: "Price/FLOP declining ~20–35%/yr historically. H100 spot rates fell from $8/hr (2023) to $2–3/hr (2025) as Blackwell supply increased.",
    year: 2025,
  },
];
