import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Dropzone({
  onImageSelected,
  selectedPreview,
  onClear,
  samplePresets = [],
  onSelectPreset,
  patientTag,
  setPatientTag,
  doctorNotes,
  setDoctorNotes,
  isLoading
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    const isDicom = file.name.toLowerCase().endsWith('.dcm') || file.type.includes('dicom');
    
    if (isDicom) {
      // Pass file object directly to backend DICOM handler
      onImageSelected({ file, previewUrl: null, fileName: file.name, isDicom: true });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        onImageSelected({
          file,
          previewUrl: reader.result,
          fileName: file.name,
          isDicom: false
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileImage className="w-4 h-4 text-clinical-400" />
            1. CXR Radiograph Input
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Supports DICOM (.dcm), high-res PNG, JPEG (Standardized to 224×224)
          </p>
        </div>

        {selectedPreview && (
          <button
            onClick={onClear}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 px-2.5 py-1 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Image</span>
          </button>
        )}
      </div>

      {/* Main Upload / Drop Area */}
      {!selectedPreview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-clinical-400 bg-clinical-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-clinical-500/60 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dcm,.png,.jpg,.jpeg,.webp,image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-clinical-500/10 border border-clinical-500/20 flex items-center justify-center text-clinical-400 shadow-inner">
              <UploadCloud className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drag and drop Frontal Chest X-Ray here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or <span className="text-clinical-400 underline font-medium">browse local files</span> from your workstation
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">DICOM 3.0</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">PNG / JPEG</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">16-bit Grayscale</span>
            </div>
          </div>
        </div>
      ) : (
        /* Preview with metadata */
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
          <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-slate-700 shadow-inner flex items-center justify-center">
            {selectedPreview.previewUrl ? (
              <img
                src={selectedPreview.previewUrl}
                alt="Selected Radiograph"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <FileImage className="w-6 h-6 text-clinical-400" />
                <span className="font-mono text-[10px]">DICOM Loaded</span>
              </div>
            )}
            <div className="absolute top-1 right-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 p-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-[200px]">
                {selectedPreview.fileName || 'Sample Radiograph'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-clinical-500/20 text-clinical-300 border border-clinical-500/30">
                Ready for QML
              </span>
            </div>
            
            {/* Patient Tag */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 flex-shrink-0">Case ID / Tag:</label>
              <input
                type="text"
                value={patientTag}
                onChange={(e) => setPatientTag(e.target.value)}
                placeholder="e.g. PT-2026-0841"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-clinical-500 font-mono"
              />
            </div>

            {/* Doctor Anamnesis / Notes */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 flex-shrink-0">Attending Notes:</label>
              <input
                type="text"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="e.g. Productive cough 3w, night sweats, right apical suspicion"
                className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-clinical-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Clinical Sample Presets */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Demo Presets (Instant Synthetic CXR Cases)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {samplePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              disabled={isLoading}
              className="flex flex-col items-start text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-clinical-500/50 transition-all group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-medium text-slate-200 group-hover:text-clinical-300">
                  {preset.name}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  preset.category === 'TB Positive' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {preset.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
