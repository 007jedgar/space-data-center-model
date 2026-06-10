"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/sources";

const CATEGORIES = Array.from(new Set(SOURCES.map((s) => s.category))).sort();

export default function SourcesList() {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const visible = activeCategory === "All"
    ? SOURCES
    : SOURCES.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              activeCategory === cat
                ? "border-gray-400 text-white bg-gray-700"
                : "border-gray-700 text-gray-400 hover:border-gray-600"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Source entries */}
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="bg-gray-900/60 rounded border border-gray-800 px-4 py-3 text-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-gray-500 uppercase tracking-wide text-[10px]">{s.category}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-500">{s.year}</span>
                </div>
                <div className="font-medium text-white mb-0.5">{s.title}</div>
                <div className="text-gray-400 leading-snug">{s.description}</div>
              </div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">
                  ↗ link
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        {SOURCES.length} sources. Model values are estimates derived from published specs, SEC filings, and industry reports.
        Numbers should be treated as order-of-magnitude approximations, not authoritative financial projections.
      </p>
    </div>
  );
}
