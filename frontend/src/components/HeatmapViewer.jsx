export default function HeatmapViewer({ originalSrc, heatmapSrc }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <figure className="overflow-hidden rounded-xl bg-slate-900">
        <img src={originalSrc} alt="Original CXR" className="h-full w-full object-contain" />
        <figcaption className="px-3 py-2 text-xs text-slate-300">Original radiograph</figcaption>
      </figure>
      <figure className="overflow-hidden rounded-xl bg-slate-900">
        <img src={heatmapSrc} alt="Grad-CAM overlay" className="h-full w-full object-contain" />
        <figcaption className="px-3 py-2 text-xs text-slate-300">Grad-CAM overlay</figcaption>
      </figure>
    </div>
  );
}
