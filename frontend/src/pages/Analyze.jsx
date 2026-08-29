import { useState } from "react";
import Dropzone from "../components/Dropzone.jsx";
import HeatmapViewer from "../components/HeatmapViewer.jsx";
import PredictionStats from "../components/PredictionStats.jsx";
import GeminiChat from "../components/GeminiChat.jsx";

export default function Analyze() {
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");

  function onFile(file) {
    if (!file) {
      return;
    }
    setFileName(file.name);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analyze CXR</h1>
        <p className="mt-1 text-slate-600">
          Upload a frontal chest radiograph. HQCNN inference will be connected on the next backend step.
        </p>
      </div>
      <Dropzone onFile={onFile} />
      {fileName ? <p className="text-sm text-slate-600">Selected: {fileName}</p> : null}
      {preview ? <HeatmapViewer originalSrc={preview} heatmapSrc={preview} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <PredictionStats probability={0} threshold={0.5} />
        <GeminiChat report="Inference API is not wired yet. The UI is running; POST /api/predict comes next." />
      </div>
    </div>
  );
}
