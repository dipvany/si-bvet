const CONFIG = {
  "Belum Verifikasi": { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  "Sudah Verifikasi":  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  "Ditolak":           { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500"    },
  "pending":           { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  "approved":          { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  "rejected":          { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500"    },
};

const LABEL = {
  "pending":  "Belum Verifikasi",
  "approved": "Sudah Verifikasi",
  "rejected": "Ditolak",
};

export default function StatusBadge({ status }) {
  const label = LABEL[status] ?? status;
  const c = CONFIG[label] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}