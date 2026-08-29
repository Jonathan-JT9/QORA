import { NavLink, Route, Routes } from "react-router-dom";
import Analyze from "./pages/Analyze.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import Settings from "./pages/Settings.jsx";

const navClass = ({ isActive }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium",
    isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100",
  ].join(" ");

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">CDSS</p>
            <h1 className="text-lg font-semibold text-slate-900">QORA</h1>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" className={navClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/analyze" className={navClass}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={navClass}>
              History
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
