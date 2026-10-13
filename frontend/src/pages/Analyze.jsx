import React, { useState, useEffect } from 'react';
import { Play, Sparkles, AlertCircle, RefreshCw, Layers, Cpu, CheckCircle2 } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import HeatmapViewer from '../components/HeatmapViewer';
import PredictionStats from '../components/PredictionStats';
import QuantumInspector from '../components/QuantumInspector';
import AnatomicalZones from '../components/AnatomicalZones';
import GeminiReport from '../components/GeminiReport';
import { analyzeCXR, fetchSamples } from '../lib/api';

export default function Analyze({ selectedBackbone }) {
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl, fileName, isDicom }
  const [patientTag, setPatientTag] = useState('PT-2026-0842');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [colormap, setColormap] = useState('jet');
  const [threshold, setThreshold] = useState(0.50);
  const [samplePresets, setSamplePresets] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load sample presets on mount
  useEffect(() => {
    fetchSamples()
      .then((data) => {
        if (data.samples && data.samples.length > 0) {
          setSamplePresets(data.samples);
        }
      })
      .catch((err) => console.warn('Could not fetch sample presets:', err));
  }, []);

  const handleImageSelected = (imageData) => {
    setSelectedImage(imageData);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleSelectPreset = (preset) => {
    setSelectedImage({
      file: null,
      previewUrl: preset.image_data_uri,
      fileName: preset.name,
      isDicom: false,
      isPreset: true,
      dataUri: preset.image_data_uri
    });
    setPatientTag(`PT-${preset.id.toUpperCase()}`);
    setDoctorNotes(`Diagnostic evaluation for suspected ${preset.category.toLowerCase()}`);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleRunInference = async () => {
    if (!selectedImage) {
      setErrorMsg('Please select or upload a radiograph image first.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let payload = {
        backbone: selectedBackbone,
        threshold: threshold,
        patientTag: patientTag,
        doctorNotes: doctorNotes,
        colormap: colormap
      };

      if (selectedImage.file) {
        payload.file = selectedImage.file;
      } else if (selectedImage.previewUrl || selectedImage.dataUri) {
        payload.imageData = selectedImage.previewUrl || selectedImage.dataUri;
      }

      const res = await analyzeCXR(payload);
      setAnalysisResult(res);
    } catch (err) {
      console.error('Inference error:', err);
      setErrorMsg(err.message || 'Radiograph analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThresholdChange = (newThreshold) => {
    setThreshold(newThreshold);
    if (analysisResult) {
      // Dynamically recalculate verdict based on existing probability
      const prob = analysisResult.tb_probability;
      const isPositive = prob >= newThreshold;
      const confidence = isPositive ? prob : (1.0 - prob);

      setAnalysisResult({
        ...analysisResult,
        threshold_applied: newThreshold,
        prediction: isPositive ? 'TB Positive' : 'Normal / Non-TB',
        label_code: isPositive ? 1 : 0,
        confidence_score: Number((confidence * 100).toFixed(2))
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Analysis Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-4 sm:p-5 rounded-2xl">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <span>Radiograph Diagnostic Workbench</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              6-Qubit PennyLane
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Execute hybrid deep feature extraction, quantum angle embedding, and multi-basis Pauli measurement.
          </p>
        </div>

        <button
          onClick={handleRunInference}
          disabled={isLoading || !selectedImage}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xl ${
            isLoading || !selectedImage
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-clinical-600 via-clinical-500 to-quantum-cyan text-white hover:opacity-95 shadow-clinical-500/30 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Simulating 6Q VQC...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Execute QORA Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Dropzone & Visualizer */}
        <div className="lg:col-span-6 space-y-6">
          <Dropzone
            onImageSelected={handleImageSelected}
            selectedPreview={selectedImage}
            onClear={handleClearImage}
            samplePresets={samplePresets}
            onSelectPreset={handleSelectPreset}
            patientTag={patientTag}
            setPatientTag={setPatientTag}
            doctorNotes={doctorNotes}
            setDoctorNotes={setDoctorNotes}
            isLoading={isLoading}
          />

          <HeatmapViewer
            originalUri={analysisResult?.visualizations?.original_uri || selectedImage?.previewUrl}
            heatmapUri={analysisResult?.visualizations?.heatmap_uri}
            overlayUri={analysisResult?.visualizations?.overlay_uri}
            anatomicalZones={analysisResult?.anatomical_zones}
            topActivatedZones={analysisResult?.top_activated_zones}
            isLoading={isLoading}
            colormap={colormap}
            setColormap={setColormap}
          />
        </div>

        {/* Right Column: Statistics, Quantum VQC Inspector & Gemini Report */}
        <div className="lg:col-span-6 space-y-6">
          
          <PredictionStats
            prediction={analysisResult?.prediction}
            probability={analysisResult?.tb_probability}
            confidence={analysisResult?.confidence_score}
            logit={analysisResult?.logit}
            threshold={threshold}
            onThresholdChange={handleThresholdChange}
            backboneName={analysisResult?.backbone_name || selectedBackbone}
            isLoading={isLoading}
          />

          <QuantumInspector
            quantumCircuit={analysisResult?.quantum_circuit}
          />

          <AnatomicalZones
            anatomicalZones={analysisResult?.anatomical_zones}
            topActivatedZones={analysisResult?.top_activated_zones}
          />

        </div>

      </div>

      {/* Bottom Section: Gemini Clinical Decision Support Report */}
      <div className="w-full">
        <GeminiReport
          reportMarkdown={analysisResult?.clinical_report}
          predictionResult={analysisResult}
          topActivatedZones={analysisResult?.top_activated_zones}
          onReportUpdated={(newReport) => {
            if (analysisResult) {
              setAnalysisResult({ ...analysisResult, clinical_report: newReport });
            }
          }}
        />
      </div>

    </div>
  );
}
