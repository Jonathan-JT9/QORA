export default function HistoryTable({ rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-2 font-medium">Time</th>
            <th className="px-4 py-2 font-medium">Finding</th>
            <th className="px-4 py-2 font-medium">Probability</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={3}>
                No analyses yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{row.created_at}</td>
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2">{row.probability}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
