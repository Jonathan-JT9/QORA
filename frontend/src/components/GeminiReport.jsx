import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Printer, RefreshCw, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { regenerateReport } from '../lib/api';

export default function GeminiReport({
  reportMarkdown,
  predictionResult,
  topActivatedZones,
  onReportUpdated
}) {
  const [copied, setCopied] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleCopy = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = async () => {
    if (!predictionResult) return;
    setIsRegenerating(true);
    try {
      const res = await regenerateReport({
        predictionResult,
        topActivatedZones,
        doctorNotes
      });
      if (res.clinical_report && onReportUpdated) {
        onReportUpdated(res.clinical_report);
        setShowNoteInput(false);
      }
    } catch (e) {
      console.error('Failed to regenerate report:', e);
      alert('Report regeneration failed: ' + e.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!reportMarkdown) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[260px] text-slate-500">
        <Sparkles className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Gemini 2.5 Flash Synthesis</p>
        <p className="text-xs text-slate-600 mt-0.5">Automated clinical report will be synthesized upon radiograph analysis.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              5. Gemini Clinical Decision Support Report
            </h3>
            <span className="text-[10px] font-mono text-purple-400">
              Synthesized by Gemini 2.5 Flash Multimodal Reasoning
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-clinical-400" />
            <span>{showNoteInput ? 'Close Notes' : 'Add Doctor Notes'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Note'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Optional Doctor Notes & Re-synthesis */}
      {showNoteInput && (
        <div className="bg-slate-900/90 border border-purple-900/50 rounded-xl p-3.5 space-y-2">
          <label className="text-xs font-semibold text-purple-300 block">
            Inject Clinical Context / Differential Query:
          </label>
          <textarea
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="e.g. Patient is HIV+ with history of contact. Please evaluate cavitary risk..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
          <div className="flex justify-end">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Re-Synthesizing...' : 'Re-Generate with Notes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Markdown Content Viewer */}
      <div className="prose prose-invert prose-slate max-w-none text-xs sm:text-sm bg-slate-950/70 rounded-xl p-5 border border-slate-800/80 leading-relaxed font-sans overflow-x-auto">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-base sm:text-lg font-extrabold text-clinical-300 border-b border-slate-800 pb-2 mb-3 tracking-wide uppercase font-mono" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-sm font-bold text-slate-200 mt-4 mb-2 flex items-center gap-1.5 uppercase font-mono" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="text-slate-300 mb-2.5 text-xs sm:text-sm leading-relaxed" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs sm:text-sm mb-3" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-xs sm:text-sm mb-3" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-amber-500/80 bg-amber-950/20 p-3 rounded-r-lg text-amber-200 text-xs my-3 italic" {...props} />
            ),
            code: ({ node, inline, ...props }) => (
              <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-[11px]" {...props} />
            )
          }}
        >
          {reportMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
