import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Eye, FileText, ArrowUpDown, Calendar, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchHistory } from '../lib/api';

export default function HistoryTable({ onSelectCase }) {
  const [historyList, setHistoryList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'positive', 'normal'
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCaseModal, setSelectedCaseModal] = useState(null);

  const loadHistoryData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHistory(100);
      setHistoryList(data.history || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const filteredHistory = historyList.filter((item) => {
    const matchesSearch = (item.patient_tag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.backbone || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'positive') return matchesSearch && (item.prediction || '').toLowerCase().includes('positive');
    if (filterType === 'normal') return matchesSearch && !(item.prediction || '').toLowerCase().includes('positive');
    return matchesSearch;
  });

  return (
    <div className="glass-card rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-clinical-400" />
            Radiograph Diagnostic History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of previously processed radiographs with model attributions and clinical notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHistoryData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Tag (e.g. PT-2026) or Backbone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-clinical-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterType === 'all' ? 'bg-clinical-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Cases ({historyList.length})
          </button>
          <button
            onClick={() => setFilterType('positive')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterType === 'positive' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TB Positive
          </button>
          <button
            onClick={() => setFilterType('normal')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterType === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Normal
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Case ID / Patient Tag</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Backbone</th>
              <th className="py-3 px-4">Clinical Verdict</th>
              <th className="py-3 px-4">TB Probability</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                  {isLoading ? 'Loading diagnosis records...' : 'No radiograph history records found.'}
                </td>
              </tr>
            ) : (
              filteredHistory.map((row) => {
                const isPositive = (row.prediction || '').toLowerCase().includes('positive');
                const prob = typeof row.probability === 'number' ? (row.probability * 100).toFixed(1) : '—';
                const conf = typeof row.confidence === 'number' ? row.confidence.toFixed(1) : '—';

                return (
                  <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {row.patient_tag || 'PT-ANON'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      {row.backbone || 'resnet50'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isPositive 
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800' 
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      }`}>
                        {isPositive ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {row.prediction || (isPositive ? 'TB Positive' : 'Normal')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                      {prob}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {conf}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedCaseModal(row)}
                        className="inline-flex items-center gap-1 text-xs text-clinical-400 hover:text-clinical-300 bg-clinical-950/40 hover:bg-clinical-900/60 border border-clinical-800/60 px-2.5 py-1 rounded-lg transition-colors font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Case Details Modal */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-200">
                  Case Record: {selectedCaseModal.patient_tag}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedCaseModal.timestamp} | Model: {selectedCaseModal.backbone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Images */}
            {(selectedCaseModal.original_image_uri || selectedCaseModal.overlay_image_uri) && (
              <div className="grid grid-cols-2 gap-3">
                {selectedCaseModal.original_image_uri && (
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">Radiograph</span>
                    <img
                      src={selectedCaseModal.original_image_uri}
                      alt="CXR"
                      className="w-full aspect-square object-cover rounded-lg border border-slate-800"
                    />
                  </div>
                )}
                {selectedCaseModal.overlay_image_uri && (
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">Grad-CAM Overlay</span>
                    <img
                      src={selectedCaseModal.overlay_image_uri}
                      alt="Grad-CAM"
                      className="w-full aspect-square object-cover rounded-lg border border-cyan-800"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Clinical Report */}
            {selectedCaseModal.clinical_report && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedCaseModal.clinical_report}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
