import React, { useState } from 'react';
import { Cpu, Compass, Orbit, BarChart3, HelpCircle, Layers, Sparkles } from 'lucide-react';

export default function QuantumInspector({ quantumCircuit }) {
  const [selectedQubit, setSelectedQubit] = useState(0);

  if (!quantumCircuit) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[220px] text-slate-500">
        <Cpu className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Quantum Circuit Inspector</p>
        <p className="text-xs text-slate-600 mt-0.5">Execute analysis to inspect 6-qubit state preparation and multi-basis expectation readouts.</p>
      </div>
    );
  }

  const { qubit_states = [], angles_rad = [], measurements = {}, output_dimension = 18 } = quantumCircuit;
  const currentQubit = qubit_states[selectedQubit] || {};

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Orbit className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            3. Quantum VQC Multi-Basis Inspector
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
            6 Wires | Ring CNOT
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/60">
            18-Dim Readout
          </span>
        </div>
      </div>

      {/* 6 Qubits Selector Strip */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300">Select Qubit Wire:</span>
          <span className="font-mono text-[11px] text-slate-400">Angle Embedding RY(θ) ∈ [0, π]</span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {qubit_states.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedQubit(idx)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedQubit === idx
                  ? 'bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <span className="text-[11px] font-mono font-bold text-slate-300 block">
                Q{idx}
              </span>
              <span className="text-[9px] font-mono text-cyan-400 mt-1 block">
                {q.angle_rad ? `${q.angle_rad.toFixed(2)} rad` : '0.00'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Qubit Detailed Bloch Coordinates */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Qubit {selectedQubit} State Vector Projections
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            RY Angle: {currentQubit.angle_rad} rad ({((currentQubit.angle_rad || 0) * 180 / Math.PI).toFixed(1)}°)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Pauli-Z */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>⟨Z⟩ (Comp. Basis)</span>
              <span className="text-cyan-300 font-bold">{currentQubit.expval_z ?? 0}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{
                  width: `${Math.abs(currentQubit.expval_z || 0) * 50}%`,
                  marginLeft: (currentQubit.expval_z || 0) >= 0 ? '50%' : `${50 - Math.abs(currentQubit.expval_z || 0) * 50}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-1">
              <span>-1.0</span>
              <span>0.0</span>
              <span>+1.0</span>
            </div>
          </div>

          {/* Pauli-X */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>⟨X⟩ (Hadamard)</span>
              <span className="text-purple-300 font-bold">{currentQubit.expval_x ?? 0}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-purple-400 transition-all duration-300"
                style={{
                  width: `${Math.abs(currentQubit.expval_x || 0) * 50}%`,
                  marginLeft: (currentQubit.expval_x || 0) >= 0 ? '50%' : `${50 - Math.abs(currentQubit.expval_x || 0) * 50}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-1">
              <span>-1.0</span>
              <span>0.0</span>
              <span>+1.0</span>
            </div>
          </div>

          {/* Pauli-Y */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>⟨Y⟩ (Phase Basis)</span>
              <span className="text-emerald-300 font-bold">{currentQubit.expval_y ?? 0}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.abs(currentQubit.expval_y || 0) * 50}%`,
                  marginLeft: (currentQubit.expval_y || 0) >= 0 ? '50%' : `${50 - Math.abs(currentQubit.expval_y || 0) * 50}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-1">
              <span>-1.0</span>
              <span>0.0</span>
              <span>+1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full 18-dim Heatmap Spectrum Bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <span className="font-mono font-semibold">18-Dimensional Quantum Feature Vector:</span>
          <span className="text-[10px] text-slate-500 font-mono">[6 × ⟨Z⟩ | 6 × ⟨X⟩ | 6 × ⟨Y⟩]</span>
        </div>

        <div className="grid grid-cols-18 gap-0.5 h-6 bg-slate-950 rounded-lg p-1 border border-slate-800 overflow-hidden">
          {(quantumCircuit.raw_18_dim || []).map((val, idx) => {
            const intensity = Math.abs(val);
            const colorClass = idx < 6 
              ? (val >= 0 ? 'bg-cyan-500' : 'bg-cyan-800')
              : idx < 12
              ? (val >= 0 ? 'bg-purple-500' : 'bg-purple-800')
              : (val >= 0 ? 'bg-emerald-500' : 'bg-emerald-800');

            return (
              <div
                key={idx}
                title={`Feature ${idx} (${idx < 6 ? 'Pauli-Z' : idx < 12 ? 'Pauli-X' : 'Pauli-Y'} Q${idx % 6}): ${val}`}
                className={`h-full rounded-sm transition-all hover:scale-110 cursor-pointer ${colorClass}`}
                style={{ opacity: 0.3 + intensity * 0.7 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
