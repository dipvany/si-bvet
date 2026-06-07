export default function InputField({
  label, type = "text", placeholder, value, onChange,
  rightSlot, error, hint, required = false,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[#233B6E] font-semibold text-sm">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm text-gray-700
            placeholder-gray-400 outline-none transition
            focus:ring-2 focus:ring-[#233B6E]/30 focus:border-[#233B6E]
            ${error ? "border-red-400" : "border-gray-200"}
            ${rightSlot ? "pr-12" : ""}`}
        />
        {rightSlot && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightSlot}
          </div>
        )}
      </div>
      {hint  && !error && <p className="text-gray-400 text-xs">{hint}</p>}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}