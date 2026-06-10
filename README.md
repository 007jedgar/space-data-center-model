# Space Datacenter Scale Model

![Space vs Earth datacenter TCO comparison dashboard](<public/images/Screenshot 2026-06-10 at 00.11.52.png>)

Interactive modeler for sizing, costing, and comparing space-based AI datacenters against ground facilities. Adjust hardware, scale, launch economics, and operating assumptions in the browser and see how thermal, mass, cost, and revenue projections change in real time.

Built with [Next.js](https://nextjs.org) 16, React 19, Tailwind CSS 4, and Recharts.

## Quick start

**Requirements:** Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run build   # production build
npm run start   # serve production build
npm run lint    # ESLint
```

## What this tool does

The app answers a practical question: *if you put hyperscale AI compute in orbit, what does it take?*

It models:

- **Thermal** — radiator area and mass from Stefan–Boltzmann heat rejection
- **Payload** — chip, radiator, solar, and structural mass; launches needed
- **Structure** — physical bounding box and radiation shielding mass
- **Economics** — launch + hardware cost, annual CAPEX/OPEX, multi-year TCO
- **Revenue** — GPU-compute-normalized revenue projections with demand and deflation
- **Earth comparison** — line-item ground datacenter TCO by location

All numbers are **estimates** for exploration and scenario planning, not engineering sign-off.

## Using the interface

The page is a single scrollable dashboard. Work top to bottom, or jump to a section.

### 1. Hardware selection

Click hardware cards to toggle them in or out of comparisons.

| Category | Examples |
|----------|----------|
| **Current space** (blue) | RAD750, AMD Versal AI Edge, LEON4/GR740 |
| **Datacenter / future space** (orange) | H100, H200, B100, B200, AWS Trainium2 |

Selected hardware drives the quick-stats cards, efficiency chart, thermal chart, and payload breakdown. Some sections use a separate **Focus hardware** dropdown (revenue, CAPEX timeline, structure).

### 2. Parameters panel

Core knobs that affect most sections:

| Parameter | What it controls |
|-----------|------------------|
| **Radiator technology** | Specific mass (kg/kW), operating temperature, emissivity |
| **Launch vehicle** | Payload capacity and $/kg (Falcon 9, Falcon Heavy, Starship, New Glenn) |
| **Radiation shielding** | Aluminum-equivalent shielding around the compute volume |
| **Chip count** | Cluster scale (presets: 30k, 100k, 300k, 1M) |
| **Annual CAPEX** | Infrastructure spend budget ($M/yr) |
| **CAPEX timeline** | Build-out horizon in years |
| **Launch cost override** | Override vehicle $/kg (e.g. model Starship at $100/kg) |
| **Maintenance / refresh / insurance** | Annual OPEX as % of CAPEX |
| **Space revenue premium** | Pricing uplift vs ground DC |
| **AI demand growth** | Annual compute demand growth |
| **Compute price deflation** | Annual GPU rental price decline |
| **CPI** | General inflation rate |

The OPEX summary at the bottom of the panel shows combined annual and multi-year spend.

### 3. Dashboard sections

| Section | Purpose |
|---------|---------|
| **Quick stats** | Per-hardware snapshot: total cost, TDP, radiator area, mass, launches |
| **Space vs Earth TCO** | Side-by-side cost breakdown vs ground DC (pick location + TCO window) |
| **Revenue projections** | Revenue, costs, and margin over time (datacenter hardware only) |
| **CAPEX timeline** | Year-by-year infrastructure build-out under your budget |
| **Physical structure & size** | Bounding box and shielding mass for the compute + radiator assembly |
| **Compute efficiency** | TOPS/W, TFLOPS/W, or TOPS/kg across selected hardware |
| **Radiator scale vs chip count** | How radiator area/mass grows with cluster size |
| **Payload mass breakdown** | Stacked mass components and launch requirements |
| **Reference scale** | ISS and grid benchmarks for intuition |

### Example workflows

**“What does 30k H100s on Starship cost?”**

1. Select H100, deselect others (or keep comparisons).
2. Set chip count to 30k, vehicle to Starship.
3. Check quick stats and payload breakdown for mass, launches, and cost.

**“Does space beat Texas for TCO?”**

1. Set focus hardware to your GPU of choice.
2. Open **Space vs Earth TCO**, pick **Texas (ERCOT)**.
3. Adjust TCO years, maintenance, and launch cost override.
4. Compare line items (electricity, water, land, labor vs launch).

**“How sensitive is revenue to demand growth?”**

1. Open **Revenue projections**, pick hardware and projection years.
2. Sweep **AI demand growth** and **compute price deflation**.
3. Watch margin and payback change in the chart.

## Project structure

```
src/
├── app/
│   ├── page.tsx          # Main dashboard — all UI state and layout
│   ├── layout.tsx
│   └── globals.css
├── components/           # Charts and visualizations
│   ├── HardwareCard.tsx
│   ├── ThermalChart.tsx
│   ├── PayloadBreakdown.tsx
│   ├── EfficiencyComparison.tsx
│   ├── CapexTimeline.tsx
│   ├── StructureVisualizer.tsx
│   ├── RevenueProjection.tsx
│   └── EarthDCComparison.tsx
└── lib/                  # Pure calculation models (no React)
    ├── hardware-specs.ts # Chips, radiators, launch vehicles
    ├── thermal-model.ts  # Stefan–Boltzmann radiator sizing
    ├── payload-model.ts  # Mass, launches, launch cost
    ├── structure-model.ts# Volume, shielding, bounding box
    ├── revenue-model.ts  # Revenue anchor and projections
    └── earth-dc-model.ts # Ground DC TCO by location
```

**Data flow:** `page.tsx` holds UI state → passes props to components → components call `lib/*` functions for numbers → Recharts renders results.

## Models and assumptions

### Thermal (`thermal-model.ts`)

Radiative rejection only (no convection in vacuum):

```
P = ε · σ · A · (T_rad⁴ − T_space⁴)
```

- Background temperature: 3.5 K (eclipse-side LEO)
- Radiator mass from technology-specific kg/kW

### Payload (`payload-model.ts`)

| Component | Assumption |
|-----------|------------|
| Chips | `mass_kg × chip_count` |
| Radiators | `power_kw × specific_mass_kg_per_kw` |
| Solar | 5 kg/kW (GaAs triple-junction) |
| Structure | 1.4× multiplier on chip mass |
| Launch cost | `total_mass × $/kg` |
| Launches | `ceil(total_mass / vehicle_payload)` |

### Structure (`structure-model.ts`)

- Compute cube from chip volume at 60% packing efficiency
- Radiators deploy flat alongside the cube (no shielding on radiators)
- Shielding presets: none, LEO COTS (~3 g/cm² Al), LEO hardened (~5 g/cm²), GEO/deep (~20 g/cm²)

### Revenue (`revenue-model.ts`)

Anchored to a 2026 reference: **200k H100-class GPUs · 300 MW · $1B/month** → ~$5,000/GPU/month. Projections normalize other hardware by compute-equivalent and apply utilization, space premium, demand growth, deflation, and CPI.

### Earth DC (`earth-dc-model.ts`)

Ground TCO includes construction ($/MW), GPU hardware, and annual OpEx: electricity (with PUE), water (WUE), land, labor, maintenance, and compliance. Locations include US average, Texas, Pacific Northwest, Virginia, and Nordics.

### Hardware costs

Per-chip unit costs are defined in `page.tsx` (`CHIP_COSTS_USD`) and mirrored in `revenue-model.ts`. Launch vehicle costs reflect approximate 2025 market rates.

## Extending the model

**Add a new GPU or space processor** — edit `src/lib/hardware-specs.ts`:

```ts
{
  id: "my-chip",
  name: "My Chip",
  category: "datacenter",
  era: "present",
  tdp_w: 700,
  compute_tflops: 60,
  compute_tops: 4000,
  mass_kg: 2.4,
  volume_l: 6.7,
  radiation_hardened: false,
  technology_node_nm: 4,
  notes: "...",
}
```

Add a matching entry to `CHIP_COSTS_USD` in `page.tsx` (and `CHIP_COSTS_USD_MAP` in `revenue-model.ts` if used there).

**Add a launch vehicle or radiator** — extend `LAUNCH_VEHICLES` or `RADIATOR_SPECS` in `hardware-specs.ts`.

**Add an earth location** — extend `EARTH_LOCATIONS` in `earth-dc-model.ts`.

**Change physics assumptions** — edit constants in the relevant `lib/*.ts` file (e.g. `SOLAR_KG_PER_KW`, `structural_mass_multiplier`, shielding presets).

Models are plain TypeScript with no external data files, so changes are type-checked at build time.

## Disclaimer

All outputs are back-of-the-envelope estimates for exploration and education. TDP values come from vendor specs where available. Thermal sizing uses idealized radiative rejection. Shielding follows simplified Al-equivalent depths inspired by NASA SP-8013. Launch and chip costs are approximate. Do not use this tool for mission design, investment decisions, or engineering review without independent validation.
