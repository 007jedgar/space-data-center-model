"use client";

import { useState } from "react";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";

const CATEGORIES = ["all", "financial", "compute", "thermal", "space", "datacenter", "units"] as const;

const CAT_COLORS: Record<string, string> = {
  financial:  "text-green-400 border-green-800 bg-green-950/30",
  compute:    "text-blue-400 border-blue-800 bg-blue-950/30",
  thermal:    "text-orange-400 border-orange-800 bg-orange-950/30",
  space:      "text-purple-400 border-purple-800 bg-purple-950/30",
  datacenter: "text-yellow-400 border-yellow-800 bg-yellow-950/30",
  units:      "text-gray-400 border-gray-700 bg-gray-800/30",
};

export default function Glossary() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const visible = activeCategory === "all"
    ? GLOSSARY
    : GLOSSARY.filter((g) => g.category === activeCategory);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/60 hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Abbreviations & Glossary</span>
          <span className="text-xs text-gray-500">{GLOSSARY.length} terms</span>
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-gray-900/30">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
                  activeCategory === cat
                    ? "border-white text-white bg-gray-700"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Term grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {visible.map((entry) => (
              <GlossaryCard key={entry.term} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  const colorClass = CAT_COLORS[entry.category] ?? CAT_COLORS.units;
  return (
    <div className={`rounded border px-3 py-2 text-xs ${colorClass}`}>
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="font-bold text-white text-sm">{entry.term}</span>
        <span className="text-gray-400 text-[11px]">{entry.full}</span>
      </div>
      <p className="text-gray-300 leading-snug">{entry.definition}</p>
    </div>
  );
}
