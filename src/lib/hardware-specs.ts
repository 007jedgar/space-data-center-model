export interface HardwareSpec {
  id: string;
  name: string;
  category: "current-space" | "datacenter";
  era: "present" | "future";
  tdp_w: number;
  compute_tflops: number; // FP32 or equivalent
  compute_tops?: number; // INT8/AI inference
  mass_kg: number;
  volume_l: number; // liters
  radiation_hardened: boolean;
  technology_node_nm: number;
  memory_bandwidth_gbs?: number;
  notes: string;
}

export interface RadiatorSpec {
  id: string;
  name: string;
  specific_mass_kg_per_kw: number; // kg per kW rejected
  cost_usd_per_kw: number; // fabrication + integration cost per kW capacity
  operating_temp_k: number; // radiator surface temp
  emissivity: number; // 0-1
  trl: number; // Technology Readiness Level 1-9
  notes: string;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  payload_to_leo_kg: number;
  cost_per_kg_usd: number;
  reusable: boolean;
}

// ─── Current Space Hardware ─────────────────────────────────────────────────

export const CURRENT_SPACE_HARDWARE: HardwareSpec[] = [
  {
    id: "rad750",
    name: "BAE Systems RAD750",
    category: "current-space",
    era: "present",
    tdp_w: 5,
    compute_tflops: 0.0000004, // ~400 MIPS ≈ tiny scalar FP
    mass_kg: 0.6,
    volume_l: 0.3,
    radiation_hardened: true,
    technology_node_nm: 250,
    notes: "Workhorse of deep-space missions (MRO, Curiosity, Kepler). Rad-hard, proven.",
  },
  {
    id: "versal-ai-edge",
    name: "AMD Versal AI Edge (space-grade)",
    category: "current-space",
    era: "present",
    tdp_w: 25,
    compute_tflops: 0.1,
    compute_tops: 4,
    mass_kg: 0.05,
    volume_l: 0.005,
    radiation_hardened: false, // COTS with shielding in LEO
    technology_node_nm: 7,
    memory_bandwidth_gbs: 58,
    notes: "Modern ACAP used in commercial LEO satellites (COTS, requires shielding). Best TOPS/W in space today.",
  },
  {
    id: "leon4-fpga",
    name: "LEON4 / GR740 (ESA)",
    category: "current-space",
    era: "present",
    tdp_w: 4,
    compute_tflops: 0.000006,
    mass_kg: 0.1,
    volume_l: 0.02,
    radiation_hardened: true,
    technology_node_nm: 130,
    notes: "ESA standard flight processor. Fully rad-hard, quad-core.",
  },
];

// ─── Datacenter / Future Space Hardware ─────────────────────────────────────

export const DATACENTER_HARDWARE: HardwareSpec[] = [
  {
    id: "h100-sxm5",
    name: "NVIDIA H100 SXM5",
    category: "datacenter",
    era: "present",
    tdp_w: 700,
    compute_tflops: 60, // FP32
    compute_tops: 3958, // INT8
    mass_kg: 2.4,
    volume_l: 6.7,
    radiation_hardened: false,
    technology_node_nm: 4,
    memory_bandwidth_gbs: 3350,
    notes: "Current LLM training workhorse. Hopper architecture.",
  },
  {
    id: "h200-sxm5",
    name: "NVIDIA H200 SXM5",
    category: "datacenter",
    era: "present",
    tdp_w: 700,
    compute_tflops: 60,
    compute_tops: 3958,
    mass_kg: 2.4,
    volume_l: 6.7,
    radiation_hardened: false,
    technology_node_nm: 4,
    memory_bandwidth_gbs: 4800, // HBM3e
    notes: "H100 die + HBM3e. Higher memory bandwidth vs H100.",
  },
  {
    id: "b100",
    name: "NVIDIA B100 (Blackwell)",
    category: "datacenter",
    era: "future",
    tdp_w: 700,
    compute_tflops: 148, // FP32
    compute_tops: 14000, // INT4
    mass_kg: 2.4,
    volume_l: 6.7,
    radiation_hardened: false,
    technology_node_nm: 4, // TSMC 4NP
    memory_bandwidth_gbs: 8000,
    notes: "Blackwell B100. ~2.5x H100 training throughput.",
  },
  {
    id: "b200",
    name: "NVIDIA B200 (Blackwell Ultra)",
    category: "datacenter",
    era: "future",
    tdp_w: 1000,
    compute_tflops: 158,
    compute_tops: 20000,
    mass_kg: 2.6,
    volume_l: 7.0,
    radiation_hardened: false,
    technology_node_nm: 4,
    memory_bandwidth_gbs: 8000,
    notes: "Blackwell Ultra. Highest TDP. Targets GB200 NVL72 rack.",
  },
  {
    id: "trainium2",
    name: "AWS Trainium2 (Trn2)",
    category: "datacenter",
    era: "present",
    tdp_w: 700,
    compute_tflops: 190, // BF16, per AWS Trn2 spec
    compute_tops: 3800, // INT8 estimated (~2x Trn1)
    mass_kg: 2.4,
    volume_l: 6.7,
    radiation_hardened: false,
    technology_node_nm: 5, // TSMC 5nm
    memory_bandwidth_gbs: 5760, // HBM2e 96 GB per chip
    notes: "AWS custom AI training chip. ~65% better price-perf than H100. Competitive TFLOPS/W.",
  },
];

// ─── Radiator Technology ─────────────────────────────────────────────────────

export const RADIATOR_SPECS: RadiatorSpec[] = [
  {
    id: "graphite-composite",
    name: "Graphite Composite Panel (heritage)",
    specific_mass_kg_per_kw: 10,
    cost_usd_per_kw: 50_000,
    operating_temp_k: 320,
    emissivity: 0.85,
    trl: 9,
    notes: "Traditional carbon-fiber panel with heat pipes. ISS heritage. $50k/kW mostly labor/integration at custom small-lot scale.",
  },
  {
    id: "loop-heat-pipe-panel",
    name: "Loop Heat Pipe + Aluminum Panel (modern)",
    specific_mass_kg_per_kw: 5,
    cost_usd_per_kw: 20_000,
    operating_temp_k: 340,
    emissivity: 0.9,
    trl: 9,
    notes: "State of practice commercial satellites ~2020s. At production scale costs could fall to $5–10k/kW.",
  },
  {
    id: "advanced-hp-radiator",
    name: "Advanced Heat Pipe Radiator (near-term)",
    specific_mass_kg_per_kw: 3,
    cost_usd_per_kw: 35_000,
    operating_temp_k: 360,
    emissivity: 0.92,
    trl: 5,
    notes: "AFRL / NASA Artemis-era. Higher performance = more cost today. TRL 5 — target for lunar Gateway.",
  },
  {
    id: "spray-phase-change",
    name: "Spray / Phase-Change Membrane Radiator (future)",
    specific_mass_kg_per_kw: 1.5,
    cost_usd_per_kw: 80_000,
    operating_temp_k: 400,
    emissivity: 0.95,
    trl: 3,
    notes: "Developmental. Liquid droplet or evaporative membrane. TRL 3 — high NRE cost, low production cost at scale.",
  },
];

// ─── Launch Vehicles ──────────────────────────────────────────────────────────

export const LAUNCH_VEHICLES: LaunchVehicle[] = [
  {
    id: "falcon9",
    name: "SpaceX Falcon 9",
    payload_to_leo_kg: 22800,
    cost_per_kg_usd: 2700,
    reusable: true,
  },
  {
    id: "falcon-heavy",
    name: "SpaceX Falcon Heavy",
    payload_to_leo_kg: 63800,
    cost_per_kg_usd: 1900,
    reusable: true,
  },
  {
    id: "starship",
    name: "SpaceX Starship (projected)",
    payload_to_leo_kg: 150000,
    cost_per_kg_usd: 100,
    reusable: true,
  },
  {
    id: "new-glenn",
    name: "Blue Origin New Glenn",
    payload_to_leo_kg: 45000,
    cost_per_kg_usd: 2200,
    reusable: true,
  },
];
