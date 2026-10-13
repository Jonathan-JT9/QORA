import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Layers, Sliders, Sparkles, Maximize2, Zap, Palette, Crosshair } from 'lucide-react';

export default function HeatmapViewer({
  originalUri,
  heatmapUri,
  overlayUri,
  anatomicalZones = [],
  topActivatedZones = [],
  isLoading,
  colormap,
  setColormap,
  onRecomputeColormap
}) {
  const [viewMode, setViewMode] = useState('split'); // 'split', 'side-by-side', 'overlay'
  const [splitPos, setSplitPos] = useState(50); // percentage 0 to 100
  const [opacity, setOpacity] = useState(55); // percentage 0 to 100
  const [isInverted, setIsInverted] = useState(false);
  const [showZonesOverlay, setShowZonesOverlay] = useState(true);
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (viewMode !== 'split' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSplitPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e) => {
    if (viewMode !== 'split' || !containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    setSplitPos((x / rect.width) * 100);
  };

  if (!originalUri && !overlayUri) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[380px] text-slate-500">
        <Layers className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Radiograph & Grad-CAM Visualizer</p>
        <p className="text-xs text-slate-600 mt-1 max-w-sm">
          Upload a Chest X-Ray or select a demo preset to generate layer-specific neural activation heatmaps.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-quantum-cyan" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            2. Dual-View Radiograph & Grad-CAM Heatmap
          </h3>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'split' ? 'bg-clinical-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split Slider
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'side-by-side' ? 'bg-clinical-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'overlay' ? 'bg-clinical-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Alpha Blend
          </button>
        </div>
      </div>

      {/* Main Image Comparison Area */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-2">
        {viewMode === 'split' && (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full max-w-[420px] aspect-square rounded-xl overflow-hidden cursor-ew-resize border border-slate-700 bg-black shadow-2xl select-none"
          >
            {/* Background Layer: Grad-CAM Overlay */}
            <img
              src={overlayUri || originalUri}
              alt="Grad-CAM Overlay"
              className={`w-full h-full object-cover ${isInverted ? 'invert' : ''}`}
            />

            {/* Foreground Layer: Original CXR (Clipped by split position) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${splitPos}%` }}
            >
              <img
                src={originalUri}
                alt="Original CXR"
                className={`w-full h-full object-cover max-w-none ${isInverted ? 'invert' : ''}`}
                style={{ width: '420px', height: '420px' }}
              />
            </div>

            {/* Split Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4]"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-[10px] font-mono text-cyan-300 shadow-lg">
                ↔
              </div>
            </div>

            {/* Interactive Labels */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-slate-700 text-[10px] font-mono text-slate-300">
              Raw CXR
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 border border-cyan-700 text-[10px] font-mono text-cyan-300">
              Grad-CAM
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Raw CXR */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Frontal Radiograph (224×224)
              </span>
              <div className="w-full aspect-square max-w-[320px] rounded-xl overflow-hidden border border-slate-700 bg-black">
                <img
                  src={originalUri}
                  alt="Original CXR"
                  className={`w-full h-full object-cover ${isInverted ? 'invert' : ''}`}
                />
              </div>
            </div>

            {/* Grad-CAM Overlay */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-mono text-cyan-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Grad-CAM Activation Heatmap
              </span>
              <div className="w-full aspect-square max-w-[320px] rounded-xl overflow-hidden border border-cyan-800 bg-black shadow-lg shadow-cyan-950/50">
                <img
                  src={overlayUri || originalUri}
                  alt="Grad-CAM Overlay"
                  className={`w-full h-full object-cover ${isInverted ? 'invert' : ''}`}
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="relative w-full max-w-[420px] aspect-square rounded-xl overflow-hidden border border-slate-700 bg-black shadow-2xl">
            {/* Base CXR */}
            <img
              src={originalUri}
              alt="Base CXR"
              className={`w-full h-full object-cover ${isInverted ? 'invert' : ''}`}
            />
            {/* Heatmap with dynamic opacity */}
            {heatmapUri && (
              <img
                src={heatmapUri}
                alt="Heatmap Layer"
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
                style={{ opacity: opacity / 100 }}
              />
            )}
          </div>
        )}
      </div>

      {/* Visual Controls Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
        {/* Opacity Control (if overlay mode or split mode) */}
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Heatmap Blend:</span>
          <input
            type="range"
            min="10"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1 accent-clinical-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="font-mono text-slate-300 w-8">{opacity}%</span>
        </div>

        {/* Colormap Selector */}
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Colormap:</span>
          <select
            value={colormap}
            onChange={(e) => {
              setColormap(e.target.value);
              if (onRecomputeColormap) onRecomputeColormap(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-clinical-500"
          >
            <option value="jet">Jet (Thermal)</option>
            <option value="viridis">Viridis (Perceptual)</option>
            <option value="magma">Magma (Radiology)</option>
          </select>
        </div>

        {/* Radiologic Inversion Toggle */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
              isInverted
                ? 'bg-slate-200 text-slate-900 border-white'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{isInverted ? 'Film Inverted' : 'Invert Grayscale'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
