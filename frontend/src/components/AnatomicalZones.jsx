import React from 'react';
import { Crosshair, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

export default function AnatomicalZones({ anatomicalZones = [], topActivatedZones = [] }) {
  if (!anatomicalZones || anatomicalZones.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[220px] text-slate-500">
        <Crosshair className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Anatomical Zone Mapping</p>
        <p className="text-xs text-slate-600 mt-0.5">Anatomical region attributions will populate upon inference completion.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            4. Anatomical Lung Field Localization
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          6 Clinical Quadrants
        </span>
      </div>

      {/* Anatomical Regions Grid */}
      <div className="space-y-2.5">
        {anatomicalZones.map((zone) => {
          const isHigh = zone.is_significantly_activated;
          const meanPct = Math.round(zone.mean_activation * 100);
          const peakPct = Math.round(zone.peak_activation * 100);

          return (
            <div
              key={zone.zone_id}
              className={`p-3 rounded-xl border transition-all ${
                isHigh
                  ? 'bg-rose-950/30 border-rose-800/80 shadow-md shadow-rose-950/40'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isHigh ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 animate-bounce" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                  <span className={`text-xs font-semibold ${isHigh ? 'text-rose-300' : 'text-slate-300'}`}>
                    {zone.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">
                    Mean: <strong className={isHigh ? 'text-rose-400' : 'text-slate-300'}>{meanPct}%</strong>
                  </span>
                  <span className="text-slate-400">
                    Peak: <strong className={isHigh ? 'text-amber-400' : 'text-slate-300'}>{peakPct}%</strong>
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHigh
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, peakPct)}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 italic">
                {zone.clinical_significance}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
