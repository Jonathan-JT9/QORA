import React from 'react';
import { Activity, Cpu, Database, Sparkles, Sliders, History as HistoryIcon, Layers, FileText } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  health, 
  selectedBackbone, 
  setSelectedBackbone,
  models,
  onOpenArchitecture
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('analyze')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-clinical-500 to-quantum-violet p-0.5 shadow-lg shadow-clinical-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-clinical-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-clinical-400">
                QORA
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clinical-500/10 text-clinical-400 border border-clinical-500/20 uppercase tracking-wide">
                HQCNN v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Quantum-Optimized Radiograph Analysis
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'analyze'
                ? 'bg-clinical-600 text-white shadow-sm shadow-clinical-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Analyze CXR</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-clinical-600 text-white shadow-sm shadow-clinical-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>Case History</span>
          </button>
          
          <button
            onClick={onOpenArchitecture}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
          >
            <Cpu className="w-3.5 h-3.5 text-quantum-cyan" />
            <span>VQC Specs</span>
          </button>
        </nav>

        {/* Status Indicators & Backbone Selector */}
        <div className="flex items-center gap-3">
          {/* Backbone Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400">Backbone:</span>
            <select
              value={selectedBackbone}
              onChange={(e) => setSelectedBackbone(e.target.value)}
              className="bg-transparent text-xs text-clinical-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="resnet50" className="bg-slate-900 text-white">ResNet-50</option>
              <option value="convnext_small" className="bg-slate-900 text-white">ConvNeXt-Small</option>
              <option value="efficientnet_b4" className="bg-slate-900 text-white">EfficientNet-B4</option>
            </select>
          </div>

          {/* System Status Badges */}
          <div className="flex items-center gap-2">
            {/* Quantum Simulator */}
            <div 
              title="PennyLane 6-Qubit Simulator: default.qubit (Active)"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 text-[10px] font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>6Q-VQC</span>
            </div>

            {/* Gemini Status */}
            <div 
              title={health?.gemini_active ? "Gemini 2.5 Flash API Online" : "Gemini Clinical Fallback Active"}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-mono ${
                health?.gemini_active 
                  ? 'bg-purple-950/40 border-purple-800/40 text-purple-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Gemini 2.5</span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
