import React from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, Activity, Gauge, Sliders, Info } from 'lucide-react';

export default function PredictionStats({
  prediction,
  probability,
  confidence,
  logit,
  threshold,
  onThresholdChange,
  backboneName,
  isLoading
}) {
  if (probability === undefined || probability === null) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[220px] text-slate-500">
        <Activity className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Inference Metrics Pending</p>
        <p className="text-xs text-slate-600 mt-0.5">Run inference to view classification outcome and posterior probability.</p>
      </div>
    );
  }

  const isPositive = probability >= threshold;
  const probPercent = (probability * 100).toFixed(1);
  const confidencePercent = confidence !== undefined ? confidence.toFixed(1) : probPercent;

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
      {/* Primary Classification Result */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border ${
            isPositive
              ? 'bg-rose-950/60 border-rose-700/80 text-rose-400 danger-glow'
              : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-400 safe-glow'
          }`}>
            {isPositive ? (
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              QORA Binary Assessment
            </span>
            <h2 className={`text-2xl font-black tracking-tight ${
              isPositive ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {isPositive ? 'TUBERCULOSIS POSITIVE' : 'NORMAL / NON-TB'}
            </h2>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Backbone Model</span>
          <p className="text-xs font-mono font-bold text-clinical-300 uppercase">
            {backboneName || 'ResNet-50'}
          </p>
        </div>
      </div>

      {/* Probability Gauge & Key Numbers */}
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        {/* TB Probability */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">
            TB Posterior P(TB)
          </span>
          <span className={`text-xl font-mono font-extrabold ${
            isPositive ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {probPercent}%
          </span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPositive ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, probability * 100))}%` }}
            />
          </div>
        </div>

        {/* Confidence Score */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">
            Confidence Score
          </span>
          <span className="text-xl font-mono font-extrabold text-cyan-300">
            {confidencePercent}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Categorical certitude
          </span>
        </div>

        {/* Logit Score */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">
            Quantum Logit Score
          </span>
          <span className="text-xl font-mono font-extrabold text-slate-200">
            {logit !== undefined ? (logit > 0 ? `+${logit.toFixed(2)}` : logit.toFixed(2)) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Pre-sigmoid readout
          </span>
        </div>
      </div>

      {/* Interactive Sensitivity / Specificity Threshold Adjuster */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-clinical-400" />
            Decision Threshold Control
          </span>
          <span className="font-mono text-clinical-400 font-bold bg-clinical-950/60 px-2 py-0.5 rounded border border-clinical-800">
            τ = {threshold.toFixed(2)}
          </span>
        </div>

        <input
          type="range"
          min="0.10"
          max="0.90"
          step="0.05"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-clinical-500"
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
          <span className={threshold <= 0.35 ? 'text-amber-400 font-bold' : ''}>
            0.10 (High Sensitivity / Screening)
          </span>
          <span className={threshold >= 0.45 && threshold <= 0.55 ? 'text-cyan-400 font-bold' : ''}>
            0.50 (Standard)
          </span>
          <span className={threshold >= 0.65 ? 'text-purple-400 font-bold' : ''}>
            0.90 (High Specificity)
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <span>
            {threshold <= 0.35 
              ? 'Screening Mode Active: Prioritizes Recall/Sensitivity to prevent missed TB cases in triage.'
              : threshold >= 0.65
              ? 'Confirmatory Mode Active: Prioritizes Precision/Specificity to reduce false positives before therapy.'
              : 'Balanced Baseline Mode: Standard thesis diagnostic threshold (τ = 0.50).'}
          </span>
        </p>
      </div>
    </div>
  );
}
