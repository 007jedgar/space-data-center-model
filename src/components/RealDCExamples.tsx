"use client";

import { REAL_DC_EXAMPLES } from "@/lib/earth-dc-model";

export default function RealDCExamples() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REAL_DC_EXAMPLES.map((dc) => (
          <div key={dc.name} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-sm font-semibold text-white">{dc.name}</div>
                <div className="text-xs text-gray-400">{dc.operator} · {dc.location}</div>
              </div>
              {dc.opened_year && (
                <span className="text-xs text-gray-500 shrink-0">{dc.opened_year}</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs mb-3">
              <Stat label="Capacity" value={`${dc.capacity_mw >= 1000 ? `${(dc.capacity_mw / 1000).toFixed(1)} GW` : `${dc.capacity_mw} MW`}`} color="text-orange-300" />
              <Stat label="Investment" value={`$${dc.capex_investment_b.toFixed(1)}B`} color="text-red-300" />
              <Stat label="Employees" value={dc.employees_onsite.toLocaleString()} color="text-purple-300" />
              {dc.gpu_count_estimate && (
                <Stat label="GPUs (est.)" value={dc.gpu_count_estimate >= 1000 ? `${(dc.gpu_count_estimate / 1000).toFixed(0)}k` : dc.gpu_count_estimate.toString()} color="text-blue-300" />
              )}
              {dc.annual_revenue_b && (
                <Stat label="Revenue/yr" value={`$${dc.annual_revenue_b.toFixed(1)}B`} color="text-green-300" />
              )}
              {dc.pue && (
                <Stat label="PUE" value={dc.pue.toFixed(2)} color="text-gray-300" />
              )}
              {dc.land_acres && (
                <Stat label="Land" value={`${dc.land_acres.toLocaleString()} ac`} color="text-yellow-300" />
              )}
              {dc.water_mgal_per_yr && (
                <Stat label="Water/yr" value={`${dc.water_mgal_per_yr.toLocaleString()} Mgal`} color="text-cyan-300" />
              )}
              {dc.gpu_count_estimate && dc.annual_revenue_b && (
                <Stat
                  label="Rev/GPU/mo"
                  value={`$${Math.round(dc.annual_revenue_b * 1e9 / dc.gpu_count_estimate / 12).toLocaleString()}`}
                  color="text-green-200"
                />
              )}
            </div>

            <p className="text-xs text-gray-400 leading-snug">{dc.notes}</p>
            <p className="text-xs text-gray-600 mt-1.5">Source: {dc.source}</p>
          </div>
        ))}
      </div>

      {/* $/MW comparison bar */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
        <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">Investment per MW Capacity</div>
        <div className="space-y-2">
          {REAL_DC_EXAMPLES.map((dc) => {
            const per_mw = dc.capex_investment_b * 1000 / dc.capacity_mw; // $M/MW
            const max_per_mw = 60; // cap for bar width
            const pct = Math.min((per_mw / max_per_mw) * 100, 100);
            return (
              <div key={dc.name}>
                <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                  <span className="truncate max-w-xs">{dc.name.split(" (")[0]}</span>
                  <span className="shrink-0 ml-2">${per_mw.toFixed(0)}M/MW · ${dc.capex_investment_b.toFixed(1)}B total</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-orange-500/70 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className={`font-medium ${color}`}>{value}</div>
    </div>
  );
}
