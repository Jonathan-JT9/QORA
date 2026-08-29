export default function Dropzone({ onFile }) {
  return (
    <label className="flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50">
      <span className="text-sm font-medium">Drop DICOM / PNG / JPEG CXR</span>
      <input
        type="file"
        accept=".dcm,.png,.jpg,.jpeg,image/png,image/jpeg"
        className="hidden"
        onChange={(event) => onFile?.(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}
