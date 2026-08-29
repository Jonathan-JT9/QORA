export default function PredictionStats({ probability = 0, threshold = 0.5, label }) {
  const pct = Math.round(Number(probability) * 100);
  const positive = Number(probability) >= threshold;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">TB probability</h3>
      <p className="mt-2 text-3xl font-semibold text-indigo-700">{pct}%</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {label ?? (positive ? "TB-positive" : "TB-negative")} · threshold {threshold}
      </p>
    </section>
  );
}
