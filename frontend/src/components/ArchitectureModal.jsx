import React from 'react';
import { Cpu, Layers, Orbit, Sparkles, X, Compass, Activity } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 border border-slate-700 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide font-mono">
                QORA Hybrid Architecture & QML Specifications
              </h2>
              <p className="text-xs text-slate-400">
                End-to-End Mathematical Blueprint: CNN + 6-Qubit VQC + Multi-Basis Pauli Readout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* High-Level Pipeline Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-mono text-clinical-400 uppercase font-bold">Step 1: Input & CNN</span>
            <h4 className="font-semibold text-slate-200">CXR Radiograph</h4>
            <p className="text-[11px] text-slate-400">
              224×224×3 RGB tensor passed through ResNet50 / ConvNeXt-Small / EfficientNet-B4.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Step 2: Projection</span>
            <h4 className="font-semibold text-slate-200">Angle Scaler [0, π]</h4>
            <p className="text-[11px] text-slate-400">
              Global Average Pooling + Projector to 6 latent features, scaled via θ = π · σ(z).
            </p>
          </div>

          <div className="bg-slate-900/90 border border-purple-800/80 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Step 3: 6-Qubit VQC</span>
            <h4 className="font-semibold text-slate-200">PennyLane Circuit</h4>
            <p className="text-[11px] text-slate-400">
              RY(θ) state preparation + 3 variational layers (RY, RZ) + Ring CNOT Entanglement.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-emerald-800/80 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Step 4: Readout & Cam</span>
            <h4 className="font-semibold text-slate-200">18-Dim Multi-Basis</h4>
            <p className="text-[11px] text-slate-400">
              ⟨Z⟩, ⟨X⟩, ⟨Y⟩ expectation values (18 dims) fed into classification head + Grad-CAM overlay.
            </p>
          </div>
        </div>

        {/* Detailed Mathematical & Circuit Specification */}
        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <h3 className="text-sm font-bold text-cyan-400 uppercase flex items-center gap-2">
              <Orbit className="w-4 h-4" /> 1. Quantum State Preparation & Angle Embedding
            </h3>
            <p className="text-slate-400 text-xs">
              Continuous feature values x_i ∈ ℝ are mapped to valid rotational parameters θ_i ∈ [0, π] using a smooth sigmoidal projection:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-cyan-300">
              |ψ_0⟩ = ⨂_(i=0)^5 RY(θ_i) |0⟩, where θ_i = π · σ(W_p · z_i + b_p)
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <h3 className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
              <Compass className="w-4 h-4" /> 2. Variational Quantum Ansatz with Ring Entanglement
            </h3>
            <p className="text-slate-400 text-xs">
              For each variational layer l ∈ [1, ..., L], parameterized rotations are interleaved with closed-ring CNOT gates:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-purple-300">
              U_l(W_l) = ∏_(i=0)^5 CNOT_(i, (i+1)%6) · ∏_(i=0)^5 [ RZ(W_(l, i, 1)) · RY(W_(l, i, 0)) ]
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <h3 className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> 3. Multi-Basis Expectation Value Readout (18 Features)
            </h3>
            <p className="text-slate-400 text-xs">
              To capture non-commuting observable statistics and phase information, expectation values are measured across 3 orthogonal Pauli bases:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-emerald-300">
              f_Q(x) = [ ⟨Z_0⟩...⟨Z_5⟩, ⟨X_0⟩...⟨X_5⟩, ⟨Y_0⟩...⟨Y_5⟩ ]^T ∈ [-1.0, 1.0]^18
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-clinical-600 hover:bg-clinical-500 text-white text-xs font-semibold shadow-lg shadow-clinical-600/30 transition-all"
          >
            Close Specifications
          </button>
        </div>

      </div>
    </div>
  );
}
