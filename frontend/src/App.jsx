import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Analyze from './pages/Analyze';
import HistoryPage from './pages/History';
import ArchitectureModal from './components/ArchitectureModal';
import { fetchHealth, fetchModels } from './lib/api';
import { Shield, Sparkles, Cpu, Activity, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze', 'history'
  const [selectedBackbone, setSelectedBackbone] = useState('resnet50');
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealth(data))
      .catch((err) => console.warn('Health check failed:', err));

    fetchModels()
      .then((data) => setModels(data))
      .catch((err) => console.warn('Models fetch failed:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-clinical-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        selectedBackbone={selectedBackbone}
        setSelectedBackbone={setSelectedBackbone}
        models={models}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'analyze' && (
          <Analyze selectedBackbone={selectedBackbone} />
        )}
        {activeTab === 'history' && (
          <HistoryPage onSelectCase={(c) => console.log('Selected case:', c)} />
        )}
      </main>

      {/* Architecture & QML Specifications Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Clinical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>QORA v1.0.0 (PennyLane 6Q-VQC + PyTorch)</span>
          </div>

          <div className="text-slate-400 text-[11px]">
            Clinical Decision Support System for Tuberculosis Screening • Investigational Use Only
          </div>

          <div className="text-[10px] text-slate-500">
            © 2026 Quantum-Optimized Radiograph Analysis
          </div>
        </div>
      </footer>
    </div>
  );
}
