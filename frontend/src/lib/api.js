/**
 * API Service for QORA Backend Communication
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch supported models');
  return res.json();
}

export async function fetchSamples() {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to fetch sample presets');
  return res.json();
}

export async function analyzeCXR({ file, imageData, backbone, threshold, patientTag, doctorNotes, colormap }) {
  let body;
  let headers = {};

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('backbone', backbone || 'resnet50');
    formData.append('threshold', threshold !== undefined ? threshold.toString() : '0.50');
    formData.append('patient_tag', patientTag || 'PT-ANON');
    formData.append('doctor_notes', doctorNotes || '');
    formData.append('colormap', colormap || 'jet');
    body = formData;
  } else if (imageData) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      image_data: imageData,
      backbone: backbone || 'resnet50',
      threshold: threshold !== undefined ? threshold : 0.50,
      patient_tag: patientTag || 'PT-ANON',
      doctor_notes: doctorNotes || '',
      colormap: colormap || 'jet'
    });
  } else {
    throw new Error('No image file or image data provided');
  }

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers,
    body
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchHistory(limit = 50, offset = 0) {
  const res = await fetch(`${API_BASE}/history?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function regenerateReport({ predictionResult, topActivatedZones, doctorNotes }) {
  const res = await fetch(`${API_BASE}/report/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prediction_result: predictionResult,
      top_activated_zones: topActivatedZones,
      doctor_notes: doctorNotes
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to regenerate report');
  }

  return res.json();
}
