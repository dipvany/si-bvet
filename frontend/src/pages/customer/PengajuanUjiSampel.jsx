import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { apiFetch } from "../../services/api";
import { updateProfile } from "../../services/CustomerServices";
import { getCart, removeFromCart, addToCart } from "../../utils/cart";
import { parseSubmissionList } from "../../utils/parseList";
import WilayahSelect from "../../components/WilayahSelect";
import {
  TYPE_SERVICE,
  PURPOSE,
  SAMPLE_MODELS,
  UNIT_AGES,
  VACCINATED,
  PRESERVATIVES,
  PACKAGES,
  SEXES_LIST,
  LOCATION_TYPES,
  SPECIMEN_GROUPS,
  getSpecimensByGroup,
  getAnimalsByGroup,
  PROVINCES,
} from "../../utils/refData";
​
const EMPTY_SAMPLE = {
  sample_code_cust: "",
  sample_model: "",
  specimen_group: "",
  specimen_type: "",
  species: "",
  preservative: "",
  packaging: "",
  production_date: "",
  expired_date: "",
  sex: "",
  age: "",
  unit_age: "bulan",
  owner: "",
  sampling: "",
  location_type: "",
  location_smpl: "",
  is_vaccinated: "Tidak Diketahui",
  test_services: [],
};
​
/* ─── Download template ─── */
const TEMPLATE_HEADERS = [
  "Kode Sampel",
  "Model Sampel",
  "Specimen Group",
  "Specimen",
  "Hewan / Species",
  "Pengawet",
  "Kemasan",
  "Tanggal Produksi",
  "Tanggal Kadaluarsa",
  "Jenis Kelamin",
  "Umur",
  "Unit Umur",
  "Pemilik Hewan",
  "Jenis Uji",
  "Jenis Lokasi",
  "Lokasi Sampel",
  "Telah Divaksin",
];
​
const downloadTemplate = async () => {
  try {
    const res = await apiFetch("/customer/submissions/samples/template");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_input_sample.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  } catch {}
  const csv = TEMPLATE_HEADERS.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_input_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
};
​
/* ─── Konversi baris array ke objek sampel ─── */
const rowToSample = (r, cartItems = []) => {
  // Kolom 13 = "Jenis Uji" — bisa berisi 1 atau beberapa nama dipisah koma/titik koma
  const rawUji = String(r[13] ?? "").trim();
  const test_services = rawUji
    ? rawUji
        .split(/[,;]+/)
        .map((name) => name.trim().toLowerCase())
        .flatMap((keyword) =>
          cartItems.filter((c) =>
            c.test_name?.toLowerCase().includes(keyword),
          ),
        )
        // hilangkan duplikat berdasarkan id
        .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
    : [];
​
  return {
    sample_code_cust: String(r[0] ?? "").trim(),
    sample_model:     String(r[1] ?? "").trim(),
    specimen_group:   String(r[2] ?? "").trim(),
    specimen_type:    String(r[3] ?? "").trim(),
    species:          String(r[4] ?? "").trim(),
    preservative:     String(r[5] ?? "").trim(),
    packaging:        String(r[6] ?? "").trim(),
    production_date:  String(r[7] ?? "").trim(),
    expired_date:     String(r[8] ?? "").trim(),
    sex:              String(r[9] ?? "").trim(),
    age:              String(r[10] ?? "").trim(),
    unit_age:         String(r[11] ?? "bulan").trim() || "bulan",
    owner:            String(r[12] ?? "").trim(),
    location_type:    String(r[14] ?? "").trim(),
    location_smpl:    String(r[15] ?? "").trim(),
    is_vaccinated:    String(r[16] ?? "Tidak Diketahui").trim() || "Tidak Diketahui",
    test_services,
    sampling:         "",
  };
};
​
/* ─── Parse CSV ─── */
const parseCSV = (file, cartItems, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const lines = e.target.result.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { callback(null, "File kosong."); return; }
      const rows = lines
        .slice(1)
        .map((line) => {
          const cols = [];
          let cur = "", inQ = false;
          for (const ch of line) {
            if (ch === '"') inQ = !inQ;
            else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
            else cur += ch;
          }
          cols.push(cur.trim());
          return cols;
        })
        .filter((r) => r[0] && String(r[0]).trim());
      callback(rows.map((r) => rowToSample(r, cartItems)), null);
    } catch (err) {
      callback(null, "Gagal membaca CSV: " + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
};
​
/* ─── Parse XLSX / XLS ─── */
const parseXLSX = (file, cartItems, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const workbook = XLSX.read(e.target.result, { type: "array", cellDates: true });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const allRows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (allRows.length < 2) { callback(null, "File kosong atau hanya berisi header."); return; }
      const dataRows = allRows
        .slice(1)
        .filter((r) => r[0] !== undefined && String(r[0]).trim() !== "");
      if (dataRows.length === 0) { callback(null, "Tidak ada data sampel di file."); return; }
      callback(dataRows.map((r) => rowToSample(r, cartItems)), null);
    } catch (err) {
      callback(null, "Gagal membaca XLSX: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};
​
const parseFile = (file, cartItems, callback) => {
  const ext = file.name.split(".").pop().toLowerCase();
  // Fetch semua layanan dari katalog supaya bisa cocokkan nama dari Excel
  // (tidak hanya yang ada di keranjang)
  apiFetch("/customer/test-services")
    .then((res) => res.json())
    .then((data) => {
      const allServices = data.test_services ?? data.services ?? data ?? [];
      // gabungkan katalog + cart, hilangkan duplikat
      const merged = [
        ...allServices,
        ...cartItems.filter((c) => !allServices.some((s) => s.id === c.id)),
      ];
      if (ext === "xlsx" || ext === "xls") parseXLSX(file, merged, callback);
      else parseCSV(file, merged, callback);
    })
    .catch(() => {
      // kalau gagal fetch katalog, fallback ke cart saja
      if (ext === "xlsx" || ext === "xls") parseXLSX(file, cartItems, callback);
      else parseCSV(file, cartItems, callback);
    });
};
​
/* ─── StepBar ─── */
const STEP_ICONS = [
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>,
];
​
function StepBar({ step }) {
  const steps = ["Data Pengajuan", "Data Sampel", "Data Pelanggan"];
  return (
    <div className="flex items-start w-full max-w-md mx-auto">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div
            key={s}
            className={`flex items-start ${i < steps.length - 1 ? "flex-1" : "flex-none"}`}
          >
            <div className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center
                border-2 transition-all
                ${
                  done
                    ? "bg-[#233B6E] border-[#233B6E] text-white"
                    : active
                      ? "bg-white border-[#233B6E] text-[#233B6E]"
                      : "bg-white border-gray-200 text-gray-300"
                }`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="w-5 h-5"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  STEP_ICONS[i]
                )}
              </div>
              <span
                className={`text-[10px] text-center leading-tight font-semibold
                ${active || done ? "text-[#233B6E]" : "text-gray-400"}`}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-5 mx-1 ${step > n ? "bg-[#233B6E]" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
​
/* ─── Field, Input, Select ─── */
function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[#233B6E]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
​
function Input({ value, onChange, placeholder, type = "text", disabled }) {
  const base =
    "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none " +
    "transition placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500 " +
    "focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]";
​
  if (type === "date") {
    return (
      <div className="relative w-full">
        <input
          type="date"
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          className={`${base} pr-10 date-input`}
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-[#415F9D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    );
  }
​
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={base}
    />
  );
}
​
function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2.5
          text-sm outline-none bg-white pr-9 text-gray-800
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          disabled:bg-gray-50 disabled:text-gray-400 transition"
      >
        <option value="">{placeholder ?? "Pilih..."}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
​
/* ─── SearchableSelect ─── */
function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
​
  const filtered = search
    ? options
        .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 60)
    : options.slice(0, 80);
​
  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
​
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((p) => !p);
          setSearch("");
        }}
        className="w-full flex items-center justify-between border border-gray-300
          rounded-xl px-3 py-2.5 text-sm bg-white outline-none text-left
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E] transition"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="w-4 h-4 text-gray-400 flex-shrink-0"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200
          rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              -- Pilih --
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">
                Tidak ditemukan
              </p>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(o.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition
                      ${o.name === value ? "bg-[#EEF0F8] text-[#233B6E] font-semibold" : "hover:bg-gray-50 text-gray-800"}`}
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
​
/* ─── MultiSelectPengujian ─── */
function MultiSelectPengujian({ selected, onChange, cartItems }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
​
  const filtered = search
    ? cartItems.filter((s) =>
        s.test_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : cartItems;
​
  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
​
  const toggle = (svc) => {
    const has = selected.some((x) => x.id === svc.id);
    onChange(
      has ? selected.filter((x) => x.id !== svc.id) : [...selected, svc],
    );
  };
​
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((p) => !p);
          setSearch("");
        }}
        className="w-full flex items-center justify-between border border-gray-300
          rounded-xl px-3 py-2.5 text-sm bg-white outline-none text-left
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E] transition min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-gray-400">Pilih jenis pengujian...</span>
          ) : (
            selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 bg-[#EEF0F8]
                  text-[#233B6E] text-xs font-semibold px-2 py-0.5 rounded-full"
              >
                {s.test_name}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(s);
                  }}
                  className="hover:text-red-500 cursor-pointer"
                >
                  ×
                </span>
              </span>
            ))
          )}
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200
          rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jenis pengujian..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/25"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">
              {cartItems.length === 0 ? "Keranjang kosong" : "Tidak ditemukan"}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map((svc) => {
                const checked = selected.some((x) => x.id === svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggle(svc)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                        text-sm transition ${checked ? "bg-[#EEF0F8]" : "hover:bg-gray-50"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center
                        justify-center flex-shrink-0 transition
                        ${checked ? "bg-[#233B6E] border-[#233B6E]" : "border-gray-300"}`}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="w-2.5 h-2.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#233B6E] truncate">
                        {svc.test_name}
                      </p>
                      {svc.unit_lab && (
                        <p className="text-xs text-gray-400">{svc.unit_lab}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="px-3 py-2 border-t border-gray-100 text-right">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-[#233B6E] hover:underline"
            >
              Selesai ({selected.length} dipilih)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
​
/* ─── WilayahSelect — provinsi hardcode, kab/kec/kel fetch API ─── */
const WILAYAH_APIS = [
  "https://emsifa.github.io/api-wilayah-indonesia/api",
  "https://ibnux.github.io/data-indonesia",
];
​
async function fetchWilayah(path, altPath) {
  try {
    const r = await fetch(`${WILAYAH_APIS[0]}/${path}`);
    if (r.ok) {
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.data ?? []);
      if (arr.length > 0) return arr;
    }
  } catch {}
  try {
    const r = await fetch(`${WILAYAH_APIS[1]}/${altPath ?? path}`);
    if (r.ok) {
      const d = await r.json();
      const arr = Array.isArray(d) ? d : [];
      return arr.map((x) => ({ code: x.id ?? x.code, name: x.nama ?? x.name }));
    }
  } catch {}
  return [];
}
​
/* ─── NavButtons ─── */
function NavButtons({ step, onBack, onNext }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
      <p className="text-xs text-gray-400 italic">
        Silahkan isi data{" "}
        {step === 1 ? "pengajuan" : step === 2 ? "sampel" : "pelanggan"} untuk
        lanjut ke tahap berikutnya
      </p>
      <div className="flex gap-2">
        {step > 1 && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600
              hover:bg-gray-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="w-4 h-4"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Kembali
          </button>
        )}
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
            text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
        >
          {step === 3 ? "Lanjut ke Pratinjau" : "Lanjut"}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="w-4 h-4"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
​
/* ═══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function PengajuanUjiSampel() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(() => getCart());
​
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
​
  const [docFiles, setDocFiles] = useState([]);
​
  /* Step 1 — sample_taker dihapus sesuai permintaan */
  const [step1, setStep1] = useState({
    type_service: "",
    purpose_of_test: "",
    date_of_send: "",
    date_of_receive: "",
    courier_name: "",
    courier_contact: "",
    cust_letter_no: "",
    id_isikhnas: "",
    agenda_no: "",
    diagnosis_required: false,
    notes: "",
  });
​
  /* Step 2 */
  const [samples, setSamples] = useState([{ ...EMPTY_SAMPLE }]);
  const [parseMsg, setParseMsg] = useState("");
  const [showImport, setShowImport] = useState(false);
  const xlsxRef = useRef();
​
  /* Step 3 */
  const [profile, setProfile] = useState(null);
  const [step3, setStep3] = useState({
    fullname: "",
    phone: "",
    institution: "",
    address: "",
    province: "",
    city: "",
    subdistrict: "",
    village: "",
    zip_code: "",
    pic_name: "",
    pic_contact: "",
    lhu_receiver: "",
    lhu_contact: "",
  });
​
  useEffect(() => {
    apiFetch("/profile")
      .then((r) => r.json())
      .then((data) => {
        const prof = data.profile ?? data;
​
        // Handle dua kemungkinan struktur response backend:
        // Struktur A (API contract): { fullname, email, customer: { province, ... } }
        // Struktur B (backend baru): { province, User: { fullname, email } }
        let user, c;
        if (prof.fullname || prof.email) {
          // Struktur A
          user = prof;
          c    = prof.customer ?? {};
        } else {
          // Struktur B
          user = prof.User ?? {};
          c    = prof;
        }
​
        setProfile({ ...user });
        setStep3({
          fullname:     user.fullname     ?? "",
          phone:        user.phone        ?? "",
          institution:  user.institution  ?? "",
          address:      c.address         ?? "",
          province:     c.province        ?? "",
          city:         c.city            ?? "",
          subdistrict:  c.subdistrict     ?? "",
          village:      c.village         ?? "",
          zip_code:     c.zip_code        ?? "",
          pic_name:     c.pic_name        ?? "",
          pic_contact:  c.pic_contact     ?? "",
          lhu_receiver: c.lhu_receiver_name    ?? c.lhu_receiver ?? "",
          lhu_contact:  c.lhu_receiver_contact ?? c.lhu_contact  ?? "",
        });
      })
      .catch(() => {});
  }, []);
​
  const setS1 = (k) => (e) =>
    setStep1((p) => ({
      ...p,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));
  const setS3 = (k) => (e) => setStep3((p) => ({ ...p, [k]: e.target.value }));
​
  const setSample = (i, k, v) =>
    setSamples((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: v };
      return next;
    });
  const addSample = () => setSamples((p) => [...p, { ...EMPTY_SAMPLE }]);
  const removeSample = (i) =>
    setSamples((p) => p.filter((_, idx) => idx !== i));
​
  const validate = () => {
    if (step === 1) {
      if (!step1.type_service) return "Jenis layanan wajib dipilih.";
      if (!step1.purpose_of_test) return "Tujuan pengujian wajib dipilih.";
      if (!step1.date_of_send) return "Tanggal kirim wajib diisi.";
    }
    if (step === 2) {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (!s.sample_code_cust)
          return `Sampel ${i + 1}: Kode sampel wajib diisi.`;
        if (!s.sample_model)
          return `Sampel ${i + 1}: Model sampel wajib dipilih.`;
        if (!s.test_services?.length)
          return `Sampel ${i + 1}: Pilih minimal 1 jenis pengujian.`;
      }
    }
    if (step === 3) {
      if (!step3.fullname) return "Nama lengkap wajib diisi.";
      if (!step3.phone) return "No. telepon wajib diisi.";
      if (!step3.institution) return "Institusi/Perusahaan wajib diisi.";
      if (!step3.address) return "Alamat wajib diisi.";
      if (!step3.province) return "Provinsi wajib dipilih.";
      if (!step3.city) return "Kabupaten/Kota wajib dipilih.";
      if (!step3.subdistrict) return "Kecamatan wajib dipilih.";
      if (!step3.village) return "Kelurahan/Desa wajib dipilih.";
    }
    return null;
  };
​
  const handleNext = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    if (step < 3) setStep((s) => s + 1);
    else setShowPreview(true);
  };
​
  const handleBack = () => {
    setError("");
    if (showPreview) setShowPreview(false);
    else setStep((s) => s - 1);
  };
​
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      // ✅ Kirim sebagai multipart/form-data — bukan raw JSON.
      // Field "samples" (array of object) di-stringify jadi satu field
      // teks JSON di dalam form. File dokumen pendukung dikirim sebagai
      // field "attachment_doc" asli (bisa lebih dari satu file).
      // PENTING: jangan set Content-Type manual — browser otomatis
      // mengisi header multipart/form-data dengan boundary yang benar
      // saat body berupa instance FormData.
      const samplesPayload = samples.map((s) => ({
        sample_code_cust: s.sample_code_cust,
        sample_model: s.sample_model,
        total_sample: Number(s.total_sample) || 1,
        specimen_group: s.specimen_group,
        specimen_type: s.specimen_type,
        species: s.species,
        batch: s.batch,
        preservative: s.preservative,
        packaging: s.packaging,
        production_date: s.production_date,
        expired_date: s.expired_date,
        sex: s.sex,
        age: s.age ? Number(s.age) : undefined,
        unit_age: s.unit_age,
        owner: s.owner,
        sampling: s.sampling,
        sampling_infra: s.sampling_infra,
        location_type: s.location_type,
        location_smpl: s.location_smpl,
        is_vaccinated: s.is_vaccinated,
        volume: s.volume,
        condition: s.condition,
        tests: s.test_services?.map((t) => ({ test_service_id: t.id })),
      }));
​
      const fd = new FormData();
      fd.append("type_service", step1.type_service);
      fd.append("purpose_of_test", step1.purpose_of_test);
      fd.append("date_of_send", step1.date_of_send);
      if (step1.date_of_receive) fd.append("date_of_receive", step1.date_of_receive);
      if (step1.courier_name) fd.append("courier_name", step1.courier_name);
      if (step1.courier_contact) fd.append("courier_contact", step1.courier_contact);
      if (step1.cust_letter_no) fd.append("cust_letter_no", step1.cust_letter_no);
      if (step1.id_isikhnas) fd.append("id_isikhnas", step1.id_isikhnas);
      if (step1.agenda_no) fd.append("agenda_no", step1.agenda_no);
      fd.append("diagnosis_required", String(step1.diagnosis_required));
      if (step1.notes) fd.append("notes", step1.notes);
      fd.append(
        "samples_count",
        String(samples.reduce((a, s) => a + (Number(s.total_sample) || 1), 0)),
      );
      fd.append("samples", JSON.stringify(samplesPayload));
​
      // Dokumen pendukung — file asli, bisa lebih dari satu
      docFiles.forEach((f) => fd.append("attachment_doc", f));
​
      const res = await apiFetch("/customer/submissions", {
        method: "POST",
        body: fd, // jangan set headers Content-Type — biarkan browser yang isi
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? d.message ?? "Gagal mengirim pengajuan.");
      }
​
      // Hapus dari keranjang hanya pengujian yang benar-benar dipakai di pengajuan ini
      const usedTestIds = new Set();
      samples.forEach((s) => {
        (s.test_services ?? []).forEach((t) => usedTestIds.add(t.id));
      });
      usedTestIds.forEach((id) => removeFromCart(id));
      window.dispatchEvent(new Event("cart-updated"));
​
      // ── Simpan cache "Tinjauan Sampel" ──
      // CATATAN: API (POST /customer/submissions) hanya membalas
      // { message: "Submission created successfully" } — tidak ada id
      // submission baru, dan tidak ada satupun endpoint GET yang
      // mengembalikan detail sampel dari submission yang sudah tersimpan.
      // Supaya pratinjau ini tetap bisa dilihat lagi di halaman Detail
      // Pengajuan, kita ambil submission terbaru milik user (asumsi id
      // terbesar = baru saja dibuat) lalu cache data pratinjaunya secara
      // lokal di browser. Kalau gagal (mis. backend down), submit tetap
      // dianggap berhasil — cache ini cuma pemanis tampilan.
      try {
        const myRes = await apiFetch("/customer/submissions/my");
        const myJson = await myRes.json();
        const mine = parseSubmissionList(myJson);
        if (mine.length) {
          const newest = mine.reduce((a, b) => (b.id > a.id ? b : a));
          localStorage.setItem(
            `tinjauan_sampel_${newest.id}`,
            JSON.stringify({
              step1,
              samples,
              step3,
              // File object tidak bisa di-serialize, simpan nama saja sebagai info
              docFileNames: docFiles.map(f => f.name),
              savedAt: Date.now(),
            }),
          );
        }
      } catch {
        // Cache gagal disimpan, tidak fatal — lanjut saja.
      }
​
      // ✅ Simpan data step3 ke profil secara otomatis setelah submit berhasil.
      // Kalau user mengubah/mengisi data di step3, data terbaru tersimpan ke profil
      // supaya pengajuan berikutnya sudah ter-isi otomatis.
      try {
        // updateProfile sudah di-import di atas (static import)
        await updateProfile({
          fullname:             step3.fullname    || undefined,
          phone:                step3.phone       || undefined,
          pic_name:             step3.pic_name    || undefined,
          pic_contact:          step3.pic_contact || undefined,
          province:             step3.province    || undefined,
          city:                 step3.city        || undefined,
          subdistrict:          step3.subdistrict || undefined,
          village:              step3.village     || undefined,
          address:              step3.address     || undefined,
          zip_code:             step3.zip_code    || undefined,
          lhu_receiver_name:    step3.lhu_receiver    || undefined,
          lhu_receiver_contact: step3.lhu_contact     || undefined,
          // institution tidak ada di ProfileRequest backend
        });
      } catch {
        // Gagal update profil tidak fatal — pengajuan tetap berhasil
      }
​
      navigate("/customer/pengajuan-saya");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };
​
  /* ── PREVIEW ── */
  if (showPreview)
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-xl font-bold text-[#233B6E]">
          Pengajuan Uji Sampel
        </h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-4 h-4"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h2 className="font-bold text-[#233B6E]">
                Pratinjau Pengajuan Sampel
              </h2>
            </div>
​
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
​
            <section>
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pengajuan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Jenis Layanan", val: step1.type_service },
                  { label: "Tujuan Pengujian", val: step1.purpose_of_test },
                  { label: "Tanggal Kirim", val: step1.date_of_send },
                  { label: "Tanggal Terima", val: step1.date_of_receive || "-" },
                  { label: "Nama Kurir", val: step1.courier_name || "-" },
                  { label: "Kontak Kurir", val: step1.courier_contact || "-" },
                  { label: "No. Surat Pelanggan", val: step1.cust_letter_no || "-" },
                  { label: "ID iSIKHNAS", val: step1.id_isikhnas || "-" },
                  { label: "No. Agenda", val: step1.agenda_no || "-" },
                  {
                    label: "Perlu Diagnosis",
                    val: step1.diagnosis_required ? "Ya" : "Tidak",
                  },
                  { label: "Catatan", val: step1.notes || "-" },
                ].map((r) => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">
                      {r.val}
                    </p>
                  </div>
                ))}
                {docFiles.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">
                      Dokumen Pendukung
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {docFiles.map((f, i) => (
                        <span
                          key={i}
                          className="text-xs bg-[#EEF0F8] text-[#233B6E] font-medium px-2.5 py-1 rounded-full"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
​
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Sampel ({samples.length} sampel)
              </p>
              {samples.map((s, i) => (
                <div key={i} className="bg-[#F6F7FB] rounded-xl p-4 mb-3 text-sm">
                  <p className="font-bold text-[#233B6E] mb-3">
                    Sampel {i + 1}: {s.sample_code_cust}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      { label: "Model Sampel",       val: s.sample_model },
                      { label: "Total Sampel",        val: s.total_sample || "1" },
                      { label: "Kelompok Spesimen",   val: s.specimen_group },
                      { label: "Jenis Spesimen",      val: s.specimen_type },
                      { label: "Hewan / Species",     val: s.species },
                      { label: "Pengawet",            val: s.preservative },
                      { label: "Kemasan",             val: s.packaging },
                      { label: "Tanggal Produksi",    val: s.production_date },
                      { label: "Tanggal Kadaluarsa",  val: s.expired_date },
                      { label: "Jenis Kelamin",       val: s.sex },
                      { label: "Umur",                val: s.age ? `${s.age} ${s.unit_age ?? ""}`.trim() : "-" },
                      { label: "Pemilik Hewan",       val: s.owner },
                      { label: "Telah Divaksin",      val: s.is_vaccinated },
                      { label: "Jenis Lokasi",        val: s.location_type },
                      { label: "Lokasi Pengambilan",  val: s.location_smpl },
                    ].map((r) => (
                      <div key={r.label}>
                        <p className="text-[11px] text-gray-400">{r.label}</p>
                        <p className="font-medium text-[#233B6E]">{r.val || "-"}</p>
                      </div>
                    ))}
                  </div>
                  {/* Jenis Pengujian */}
                  {s.test_services?.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-[11px] text-gray-400 mb-1.5">Jenis Pengujian</p>
                      <div className="flex flex-wrap gap-1">
                        {s.test_services.map((t) => (
                          <span key={t.id}
                            className="bg-[#233B6E]/10 text-[#233B6E] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {t.test_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
​
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pelanggan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Nama Lengkap", val: step3.fullname },
                  { label: "No. Telepon", val: step3.phone },
                  { label: "Institusi", val: step3.institution },
                  { label: "Alamat", val: step3.address },
                  { label: "Provinsi", val: step3.province },
                  { label: "Kota", val: step3.city },
                  { label: "Kecamatan", val: step3.subdistrict },
                  { label: "Kelurahan", val: step3.village },
                  { label: "Nama PIC", val: step3.pic_name },
                  { label: "Kontak PIC", val: step3.pic_contact },
                  { label: "Nama Penerima LHU", val: step3.lhu_receiver },
                  { label: "Kontak Penerima LHU", val: step3.lhu_contact },
                ].map((r) => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">
                      {r.val || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="border-t border-gray-100 pt-4">
  <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
    Estimasi Harga
  </p>
  {(() => {
    const rupiah = (n) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n ?? 0);
    const map = new Map();
    samples.forEach((s) => {
      const qty = Number(s.total_sample) || 1;
      (s.test_services ?? []).forEach((t) => {
        const key = t.id ?? t.test_name;
        const prev = map.get(key) ?? {
          name: t.test_name ?? "-",
          price: Number(t.price) || 0,
          qty: 0,
        };
        prev.qty += qty;
        map.set(key, prev);
      });
    });
    const estLines = [...map.values()];
    if (estLines.length === 0)
      return (
        <p className="text-sm text-gray-400">
          Belum ada pengujian dipilih.
        </p>
      );
    const estTotal = estLines.reduce((a, l) => a + l.price * l.qty, 0);
    return (
      <div className="border border-[#233B6E]/20 rounded-2xl bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-[#EEF0F8]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 flex-shrink-0 text-[#233B6E]"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <p className="text-sm font-bold text-[#233B6E]">
            Estimasi Harga Pengujian
          </p>
        </div>
        <div className="px-5 py-4">
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-3 font-semibold">Pengujian</th>
                <th className="py-2 px-3 font-semibold text-right">Harga Satuan</th>
                <th className="py-2 px-3 font-semibold text-center">Jml Sampel</th>
                <th className="py-2 pl-3 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {estLines.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-gray-700">{l.name}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{rupiah(l.price)}</td>
                  <td className="py-2 px-3 text-center text-gray-600">{l.qty}</td>
                  <td className="py-2 pl-3 text-right font-semibold text-gray-800">{rupiah(l.price * l.qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="py-2.5 pr-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Estimasi Total</td>
                <td className="py-2.5 pl-3 text-right text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</td>
              </tr>
            </tfoot>
          </table>
          {/* Mobile: daftar bertumpuk biar subtotal & total tidak terpotong */}
          <div className="sm:hidden divide-y divide-gray-100">
            {estLines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 break-words leading-snug">{l.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {rupiah(l.price)} × {l.qty} sampel
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{rupiah(l.price * l.qty)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimasi Total</span>
              <span className="text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 italic">
            *Estimasi berdasarkan tarif layanan &amp; jumlah sampel. Total tagihan final ditetapkan admin.
          </p>
        </div>
      </div>
    );
  })()}
</section>
          </div>
        </div>
​
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 italic">
            Silahkan periksa kembali data sebelum pengajuan
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="border border-gray-300 text-gray-600 hover:bg-gray-100
              text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="w-4 h-4"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Kembali
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm
              px-6 py-2 rounded-xl disabled:opacity-60 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Mengirim...
                </>
              ) : (
                "Ajukan"
              )}
            </button>
          </div>
        </div>
      </div>
    );
​
  /* ── STEP FORMS ── */
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Uji Sampel</h1>
​
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <StepBar step={step} />
      </div>
​
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6">
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-600 text-sm
              rounded-xl px-4 py-3 mb-5"
            >
              {error}
            </div>
          )}
​
          {/* STEP 1 — ✅ FIX: Field "Pengambil Sampel" dan "Dokumen Pendukung" dihapus */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">
                1. Formulir Data Pengajuan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jenis Layanan" required>
                  <Select
                    value={step1.type_service}
                    onChange={setS1("type_service")}
                    options={TYPE_SERVICE}
                    placeholder="Pilih jenis layanan"
                  />
                </Field>
                <Field label="Tujuan Pengujian" required>
                  <Select
                    value={step1.purpose_of_test}
                    onChange={setS1("purpose_of_test")}
                    options={PURPOSE}
                    placeholder="Pilih tujuan pengujian"
                  />
                </Field>
                <Field label="Tanggal Kirim" required>
                  <Input
                    type="date"
                    value={step1.date_of_send}
                    onChange={setS1("date_of_send")}
                  />
                </Field>
                <Field label="Tanggal Terima">
                  <Input
                    type="date"
                    value={step1.date_of_receive}
                    onChange={setS1("date_of_receive")}
                  />
                </Field>
                <Field label="No. Surat Pelanggan">
                  <Input
                    value={step1.cust_letter_no}
                    onChange={setS1("cust_letter_no")}
                    placeholder="cth: 001/SURAT/2026"
                  />
                </Field>
                <Field label="ID iSIKHNAS">
                  <Input
                    value={step1.id_isikhnas}
                    onChange={setS1("id_isikhnas")}
                    placeholder="ID iSIKHNAS (jika ada)"
                  />
                </Field>
                <Field label="No. Agenda">
                  <Input
                    value={step1.agenda_no}
                    onChange={setS1("agenda_no")}
                    placeholder="Nomor agenda"
                  />
                </Field>
                <Field label="Nama Kurir">
                  <Input
                    value={step1.courier_name}
                    onChange={setS1("courier_name")}
                    placeholder="cth: JNE, TIKI, Pribadi"
                  />
                </Field>
                <Field label="Kontak Kurir">
                  <Input
                    value={step1.courier_contact}
                    onChange={setS1("courier_contact")}
                    placeholder="No. HP kurir"
                  />
                </Field>
                <Field label="Perlu Diagnosis">
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={step1.diagnosis_required}
                      onChange={setS1("diagnosis_required")}
                      className="w-4 h-4 accent-[#233B6E] cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">
                      Ya, diperlukan diagnosis
                    </span>
                  </div>
                </Field>
              </div>
              <Field label="Catatan">
                <textarea
                  value={step1.notes}
                  onChange={setS1("notes")}
                  rows={3}
                  placeholder="Catatan tambahan (opsional)..."
                  className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                    outline-none resize-none transition placeholder-gray-400
                    focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]"
                />
              </Field>
​
              <Field
                label={
                  <>
                    Dokumen Pendukung{" "}
                    <span className="text-gray-400 font-normal text-xs">(KTM/Surat Instansi/KTP)</span>
                  </>
                }
                hint="PDF/JPG/PNG, maks 5MB per file"
              >
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 border border-dashed border-gray-300
                    rounded-xl px-4 py-3 cursor-pointer hover:border-[#233B6E] text-gray-400 text-sm transition"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 flex-shrink-0"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {docFiles.length > 0
                        ? `${docFiles.length} file dipilih — klik untuk tambah lagi`
                        : "Pilih file dokumen pendukung..."}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files);
                        if (newFiles.length === 0) return;
                        setDocFiles((p) => [...p, ...newFiles]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {docFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {docFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${f.size}-${idx}`}
                          className="flex items-center justify-between bg-[#F6F7FB]
                          rounded-lg px-3 py-2 text-sm"
                        >
                          <span className="text-[#233B6E] font-medium truncate flex items-center gap-2">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3.5 h-3.5 flex-shrink-0"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            {f.name}
                            <span className="text-gray-400 font-normal text-xs flex-shrink-0">
                              ({(f.size / 1024).toFixed(0)} KB)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDocFiles((p) => p.filter((_, i) => i !== idx))
                            }
                            className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="w-4 h-4"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}
​
          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-[#233B6E]">
                  2. Formulir Data Sampel
                </h2>
                {cartItems.length === 0 && (
                  <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">
                    Keranjang kosong — tambah pengujian dari katalog
                  </span>
                )}
              </div>
​
              <div
                className="border border-gray-200 rounded-xl px-4 py-3
                flex items-center justify-between gap-3 flex-wrap"
              >
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showImport}
                    onChange={(e) => setShowImport(e.target.checked)}
                    className="w-4 h-4 accent-[#233B6E] cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    Memasukkan sampel dengan jumlah banyak (unggah template)
                  </span>
                </label>
                {showImport && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex items-center gap-1.5 bg-[#EEF0F8] hover:bg-[#dde0ee]
                        text-[#233B6E] text-xs font-bold px-4 py-2 rounded-xl transition border border-[#233B6E]/20"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Unduh
                    </button>
                    <button
                      type="button"
                      onClick={() => xlsxRef.current.click()}
                      className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
                        text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Unggah
                    </button>
                    <input
                      ref={xlsxRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setParseMsg("Membaca file...");
                        parseFile(file, cartItems, (parsed, err) => {
                          if (err) {
                            setParseMsg("✗ " + err);
                            return;
                          }
                          // Kumpulkan semua pengujian unik dari hasil parse
                          const allFromFile = parsed.flatMap((s) => s.test_services ?? []);
                          const unique = [...new Map(allFromFile.map((t) => [t.id, t])).values()];
​
                          // Tambah ke cart dan update state cartItems sekaligus
                          // supaya chip langsung tampil tanpa perlu klik lagi
                          unique.forEach((svc) => addToCart(svc));
                          if (unique.length > 0) setCartItems(getCart());
​
                          setSamples(
                            parsed.length > 0 ? parsed : [{ ...EMPTY_SAMPLE }],
                          );
​
                          const addedCount = unique.filter(
                            (svc) => !cartItems.some((c) => c.id === svc.id)
                          ).length;
                          setParseMsg(
                            `✓ ${parsed.length} sampel berhasil diimpor.` +
                            (addedCount > 0
                              ? ` (${addedCount} pengujian otomatis ditambah ke keranjang)`
                              : ""),
                          );
                        });
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>
​
              {parseMsg && (
                <p
                  className={`text-xs font-medium px-1
                  ${
                    parseMsg.startsWith("✓")
                      ? "text-green-600"
                      : parseMsg.startsWith("✗")
                        ? "text-red-500"
                        : "text-gray-500"
                  }`}
                >
                  {parseMsg}
                </p>
              )}
​
              {samples.map((s, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-2xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#233B6E] text-sm">
                      Sampel {i + 1}
                    </h3>
                    {samples.length > 1 && (
                      <button
                        onClick={() => removeSample(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium flex items-center gap-1"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                        </svg>
                        Hapus
                      </button>
                    )}
                  </div>
​
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Kode Sampel Pelanggan" required>
                      <Input
                        value={s.sample_code_cust}
                        onChange={(e) =>
                          setSample(i, "sample_code_cust", e.target.value)
                        }
                        placeholder="Masukkan kode sampel Anda"
                      />
                    </Field>
                    <Field label="Model Sampel" required>
                      <Select
                        value={s.sample_model}
                        onChange={(e) =>
                          setSample(i, "sample_model", e.target.value)
                        }
                        options={SAMPLE_MODELS}
                        placeholder="Pilih model sampel"
                      />
                    </Field>
                    <Field label="Total Sampel">
                      <Input
                        type="number"
                        value={s.total_sample}
                        onChange={(e) =>
                          setSample(i, "total_sample", e.target.value)
                        }
                        placeholder="1"
                      />
                    </Field>
                    <Field label="Kelompok Spesimen">
                      <Select
                        value={s.specimen_group}
                        onChange={(e) => {
                          setSample(i, "specimen_group", e.target.value);
                          setSample(i, "specimen_type", "");
                          setSample(i, "species", "");
                        }}
                        options={SPECIMEN_GROUPS.map((g) => g.name)}
                        placeholder="Pilih kelompok spesimen"
                      />
                    </Field>
                    <Field
                      label="Jenis Spesimen"
                      hint={
                        !s.specimen_group ? "Pilih kelompok spesimen dulu" : ""
                      }
                    >
                      <SearchableSelect
                        value={s.specimen_type}
                        onChange={(v) => setSample(i, "specimen_type", v)}
                        options={getSpecimensByGroup(s.specimen_group)}
                        placeholder={
                          !s.specimen_group
                            ? "Pilih kelompok spesimen dulu"
                            : "Cari jenis spesimen..."
                        }
                      />
                    </Field>
                    <Field
                      label="Hewan / Species"
                      hint={
                        !s.specimen_group ? "Pilih kelompok spesimen dulu" : ""
                      }
                    >
                      <SearchableSelect
                        value={s.species}
                        onChange={(v) => setSample(i, "species", v)}
                        options={getAnimalsByGroup(s.specimen_group)}
                        placeholder={
                          !s.specimen_group
                            ? "Pilih kelompok spesimen dulu"
                            : "Cari hewan / species..."
                        }
                      />
                    </Field>
                    <Field label="Pengawet">
                      <Select
                        value={s.preservative}
                        onChange={(e) =>
                          setSample(i, "preservative", e.target.value)
                        }
                        options={PRESERVATIVES}
                        placeholder="Pilih pengawet"
                      />
                    </Field>
                    <Field label="Kemasan">
                      <Select
                        value={s.packaging}
                        onChange={(e) =>
                          setSample(i, "packaging", e.target.value)
                        }
                        options={PACKAGES}
                        placeholder="Pilih kemasan"
                      />
                    </Field>
                    <Field label="Tanggal Produksi">
                      <Input
                        type="date"
                        value={s.production_date}
                        onChange={(e) =>
                          setSample(i, "production_date", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Tanggal Kadaluarsa">
                      <Input
                        type="date"
                        value={s.expired_date}
                        onChange={(e) =>
                          setSample(i, "expired_date", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Jenis Kelamin">
                      <Select
                        value={s.sex}
                        onChange={(e) => setSample(i, "sex", e.target.value)}
                        options={SEXES_LIST}
                        placeholder="Pilih jenis kelamin"
                      />
                    </Field>
                    <Field label="Umur">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={s.age}
                          onChange={(e) => setSample(i, "age", e.target.value)}
                          placeholder="0"
                        />
                        <div className="w-32">
                          <Select
                            value={s.unit_age}
                            onChange={(e) =>
                              setSample(i, "unit_age", e.target.value)
                            }
                            options={UNIT_AGES}
                            placeholder=""
                          />
                        </div>
                      </div>
                    </Field>
                    <Field label="Pemilik Hewan">
                      <Input
                        value={s.owner}
                        onChange={(e) => setSample(i, "owner", e.target.value)}
                        placeholder="Nama pemilik hewan"
                      />
                    </Field>
                    <Field label="Telah Divaksin">
                      <Select
                        value={s.is_vaccinated}
                        onChange={(e) =>
                          setSample(i, "is_vaccinated", e.target.value)
                        }
                        options={VACCINATED}
                        placeholder="Status vaksinasi"
                      />
                    </Field>
                    <Field label="Lokasi Pengambilan">
                      <Input
                        value={s.location_smpl}
                        onChange={(e) =>
                          setSample(i, "location_smpl", e.target.value)
                        }
                        placeholder="cth: Bandar Lampung"
                      />
                    </Field>
                    <Field label="Jenis Lokasi">
                      <Select
                        value={s.location_type}
                        onChange={(e) =>
                          setSample(i, "location_type", e.target.value)
                        }
                        options={LOCATION_TYPES}
                        placeholder="Pilih jenis lokasi"
                      />
                    </Field>
                  </div>
​
                  <Field
                    label="Jenis Pengujian Sampel"
                    required
                    hint={
                      cartItems.length === 0
                        ? "Keranjang kosong — tambah dari katalog dulu"
                        : `${cartItems.length} pengujian tersedia`
                    }
                  >
                    {cartItems.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-400">
                        Keranjang kosong.{" "}
                        <button
                          onClick={() =>
                            navigate("/customer/katalog-pengujian")
                          }
                          className="text-[#233B6E] font-semibold hover:underline"
                        >
                          Tambah dari katalog
                        </button>
                      </div>
                    ) : (
                      <MultiSelectPengujian
                        selected={s.test_services ?? []}
                        onChange={(v) => setSample(i, "test_services", v)}
                        cartItems={cartItems}
                      />
                    )}
                  </Field>
                </div>
              ))}
​
              <button
                onClick={addSample}
                className="w-full border-2 border-dashed border-[#233B6E]/30
                  hover:border-[#233B6E] text-[#233B6E] text-sm font-semibold
                  py-3 rounded-2xl flex items-center justify-center gap-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-4 h-4"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Sampel
              </button>
​
              {/* ── Estimasi Harga ── */}
              {(() => {
                const rupiah = (n) =>
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(n ?? 0);
                // Agregasi per layanan: harga satuan & total jumlah sampel
                const map = new Map();
                samples.forEach((s) => {
                  const qty = Number(s.total_sample) || 1;
                  (s.test_services ?? []).forEach((t) => {
                    const key = t.id ?? t.test_name;
                    const prev = map.get(key) ?? {
                      name: t.test_name ?? "-",
                      price: Number(t.price) || 0,
                      qty: 0,
                    };
                    prev.qty += qty;
                    map.set(key, prev);
                  });
                });
                const estLines = [...map.values()];
                if (estLines.length === 0) return null;
                const estTotal = estLines.reduce(
                  (a, l) => a + l.price * l.qty,
                  0,
                );
                return (
                  <div className="border border-[#233B6E]/20 rounded-2xl bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-[#EEF0F8]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 flex-shrink-0 text-[#233B6E]"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <p className="text-sm font-bold text-[#233B6E]">
                        Estimasi Harga Pengujian
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <table className="hidden sm:table w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                            <th className="py-2 pr-3 font-semibold">Pengujian</th>
                            <th className="py-2 px-3 font-semibold text-right">Harga Satuan</th>
                            <th className="py-2 px-3 font-semibold text-center">Jml Sampel</th>
                            <th className="py-2 pl-3 font-semibold text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {estLines.map((l, i) => (
                            <tr key={i}>
                              <td className="py-2 pr-3 text-gray-700">{l.name}</td>
                              <td className="py-2 px-3 text-right text-gray-600">{rupiah(l.price)}</td>
                              <td className="py-2 px-3 text-center text-gray-600">{l.qty}</td>
                              <td className="py-2 pl-3 text-right font-semibold text-gray-800">{rupiah(l.price * l.qty)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={3} className="py-2.5 pr-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Estimasi Total</td>
                            <td className="py-2.5 pl-3 text-right text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      {/* Mobile: daftar bertumpuk biar subtotal & total tidak terpotong */}
                      <div className="sm:hidden divide-y divide-gray-100">
                        {estLines.map((l, i) => (
                          <div key={i} className="flex justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 break-words leading-snug">{l.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {rupiah(l.price)} × {l.qty} sampel
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{rupiah(l.price * l.qty)}</p>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimasi Total</span>
                          <span className="text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 italic">
                        *Estimasi berdasarkan tarif layanan &amp; jumlah sampel. Total tagihan final ditetapkan admin.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
​
          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">
                3. Formulir Data Pelanggan
              </h2>
              <p className="text-xs text-gray-500">
                Data diambil dari profil Anda. Field kosong harap dilengkapi.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap/Perusahaan" required>
                  <Input
                    value={step3.fullname}
                    onChange={setS3("fullname")}
                    placeholder="Nama lengkap"
                  />
                </Field>
                <Field label="Email">
                  <Input value={profile?.email ?? ""} disabled />
                </Field>
                <Field label="No. Telepon" required>
                  <Input
                    value={step3.phone}
                    onChange={setS3("phone")}
                    placeholder="08XXXXXXXXXX"
                  />
                </Field>
                <Field label="Institusi/Perusahaan" required>
                  <Input
                    value={step3.institution}
                    onChange={setS3("institution")}
                    placeholder="Nama institusi"
                  />
                </Field>
                <Field label="Alamat" required>
                  <Input
                    value={step3.address}
                    onChange={setS3("address")}
                    placeholder="Alamat lengkap"
                  />
                </Field>
                <Field label="Kode Pos">
                  <Input
                    value={step3.zip_code}
                    onChange={setS3("zip_code")}
                    placeholder="cth: 35141"
                  />
                </Field>
                <WilayahSelect
                  value={step3}
                  onChange={(f) => setStep3((p) => ({ ...p, ...f }))}
                  required
                />
                <Field label="Nama PIC">
                  <Input
                    value={step3.pic_name}
                    onChange={setS3("pic_name")}
                    placeholder="Nama narahubung"
                  />
                </Field>
                <Field label="Kontak PIC">
                  <Input
                    value={step3.pic_contact}
                    onChange={setS3("pic_contact")}
                    placeholder="No. HP narahubung"
                  />
                </Field>
                <Field label="Nama Penerima LHU">
                  <Input
                    value={step3.lhu_receiver}
                    onChange={setS3("lhu_receiver")}
                    placeholder="Nama penerima Laporan Hasil Uji"
                  />
                </Field>
                <Field label="Kontak Penerima LHU">
                  <Input
                    value={step3.lhu_contact}
                    onChange={setS3("lhu_contact")}
                    placeholder="No. HP penerima LHU"
                  />
                </Field>
              </div>
            </div>
          )}
​
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </div>
      </div>
    </div>
  );
}