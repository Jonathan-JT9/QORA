import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setHealth("ok"))
      .catch(() => setHealth("down"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">QORA Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Quantum-Optimized Radiograph Analysis — clinical decision support for TB from frontal CXR.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">API status</h2>
          <p className="mt-2 text-sm">
            {health === "checking" && <span className="text-slate-500">Checking Flask…</span>}
            {health === "ok" && <span className="font-medium text-emerald-700">Backend online</span>}
            {health === "down" && (
              <span className="font-medium text-amber-700">
                Backend offline — start Flask on port 5000
              </span>
            )}
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Next step</h2>
          <p className="mt-2 text-sm text-slate-600">Upload a chest X-ray to open the analysis workspace.</p>
          <Link
            to="/analyze"
            className="mt-4 inline-flex rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Analyze CXR
          </Link>
        </section>
      </div>
      <p className="text-xs text-slate-500">Decision support only — not a medical diagnosis.</p>
    </div>
  );
}
