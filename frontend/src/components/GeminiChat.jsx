export default function GeminiChat({ report = "" }) {
  return (
    <article className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-4">
      <h3>Clinical AI note</h3>
      <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
        Decision support only — not a diagnosis
      </p>
      <pre className="whitespace-pre-wrap text-sm text-slate-700">{report || "No report yet."}</pre>
    </article>
  );
}
