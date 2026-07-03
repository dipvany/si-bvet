/**
 * WilayahSelect — komponen dropdown bertingkat:
 * Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa
 *
 * Props:
 *   value    : { province, city, subdistrict, village }
 *   onChange : (fields) => void  — dipanggil dengan object field yang berubah
 *   required : bool
 *
 * Cara pakai di Profil:
 *   <WilayahSelect
 *     value={{ province, city, subdistrict, village }}
 *     onChange={(f) => {
 *       if ("province"    in f) setProvince(f.province);
 *       if ("city"        in f) setCity(f.city);
 *       if ("subdistrict" in f) setSubdistrict(f.subdistrict);
 *       if ("village"     in f) setVillage(f.village);
 *     }}
 *     required
 *   />
 *
 * Cara pakai di PengajuanUjiSampel (step3):
 *   <WilayahSelect
 *     value={step3}
 *     onChange={(f) => setStep3(p => ({ ...p, ...f }))}
 *     required
 *   />
 */

import { useState, useEffect } from "react";
import { PROVINCES } from "../utils/refData";

const WILAYAH_APIS = [
  "https://emsifa.github.io/api-wilayah-indonesia/api",
  "https://ibnux.github.io/data-indonesia",
];

async function fetchWilayah(path, altPath) {
  try {
    const r = await fetch(`${WILAYAH_APIS[0]}/${path}`);
    if (r.ok) {
      const d   = await r.json();
      const arr = Array.isArray(d) ? d : (d.data ?? []);
      if (arr.length > 0) return arr;
    }
  } catch {}
  try {
    const r = await fetch(`${WILAYAH_APIS[1]}/${altPath ?? path}`);
    if (r.ok) {
      const d = await r.json();
      return Array.isArray(d)
        ? d.map((x) => ({ code: x.id ?? x.code, name: x.nama ?? x.name }))
        : [];
    }
  } catch {}
  return [];
}

const getId = (o) => o.code ?? o.id ?? "";

/* ── Dropdown satu level ── */
function WDD({ label, required, value, onChange, opts, loading, disabled, placeholder, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={(() => { const f = opts.find((o) => o.name === value); return f ? getId(f) : ""; })()}
          onChange={onChange}
          disabled={disabled || loading}
          className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5
            text-sm outline-none bg-white pr-9 text-gray-800 transition
            focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">
            {loading ? "Memuat..." : disabled ? "Pilih sebelumnya dulu" : placeholder}
          </option>
          {opts.map((o) => (
            <option key={getId(o)} value={getId(o)}>{o.name}</option>
          ))}
        </select>

        {loading ? (
          <svg className="animate-spin w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
            text-[#233B6E] pointer-events-none" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4 absolute right-3 top-1/2
            -translate-y-1/2 text-gray-400 pointer-events-none">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ── Komponen utama ── */
export default function WilayahSelect({ value = {}, onChange, required = false }) {
  const [regencies,   setRegencies]   = useState([]);
  const [districts,   setDistricts]   = useState([]);
  const [villages,    setVillages]    = useState([]);
  const [loadingReg,  setLoadingReg]  = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingVil,  setLoadingVil]  = useState(false);
  const [errReg,      setErrReg]      = useState("");
  const [errDist,     setErrDist]     = useState("");
  const [errVil,      setErrVil]      = useState("");
  const [provId,      setProvId]      = useState("");
  const [regId,       setRegId]       = useState("");
  const [distId,      setDistId]      = useState("");

  // Sync provId dari value.province kalau sudah ada (misal dari profil/pre-fill)
  useEffect(() => {
    if (value.province && !provId) {
      const found = PROVINCES.find(
        (p) => p.name.toLowerCase() === value.province.toLowerCase()
      );
      if (found) setProvId(found.id);
    }
  }, [value.province]);

  // Fetch kabupaten kalau provId berubah
  useEffect(() => {
    if (!provId) { setRegencies([]); setDistricts([]); setVillages([]); return; }
    setLoadingReg(true); setErrReg("");
    setRegencies([]); setDistricts([]); setVillages([]);
    fetchWilayah(`regencies/${provId}.json`, `kabupaten/${provId}.json`)
      .then((d) => { setRegencies(d); if (!d.length) setErrReg("Gagal memuat data kabupaten."); })
      .finally(() => setLoadingReg(false));
  }, [provId]);

  // Sync regId dari value.city kalau regencies sudah ada
  useEffect(() => {
    if (value.city && regencies.length && !regId) {
      const found = regencies.find(
        (r) => r.name.toLowerCase() === value.city.toLowerCase()
      );
      if (found) setRegId(getId(found));
    }
  }, [value.city, regencies]);

  // Fetch kecamatan kalau regId berubah
  useEffect(() => {
    if (!regId) { setDistricts([]); setVillages([]); return; }
    setLoadingDist(true); setErrDist("");
    setDistricts([]); setVillages([]);
    fetchWilayah(`districts/${regId}.json`, `kecamatan/${regId}.json`)
      .then((d) => { setDistricts(d); if (!d.length) setErrDist("Gagal memuat data kecamatan."); })
      .finally(() => setLoadingDist(false));
  }, [regId]);

  // Sync distId dari value.subdistrict kalau districts sudah ada
  useEffect(() => {
    if (value.subdistrict && districts.length && !distId) {
      const found = districts.find(
        (d) => d.name.toLowerCase() === value.subdistrict.toLowerCase()
      );
      if (found) setDistId(getId(found));
    }
  }, [value.subdistrict, districts]);

  // Fetch kelurahan kalau distId berubah
  useEffect(() => {
    if (!distId) { setVillages([]); return; }
    setLoadingVil(true); setErrVil("");
    setVillages([]);
    fetchWilayah(`villages/${distId}.json`, `kelurahan/${distId}.json`)
      .then((d) => { setVillages(d); if (!d.length) setErrVil("Gagal memuat data kelurahan."); })
      .finally(() => setLoadingVil(false));
  }, [distId]);

  const handleProv = (e) => {
    const id   = e.target.value;
    const name = PROVINCES.find((p) => p.id === id)?.name ?? "";
    setProvId(id); setRegId(""); setDistId("");
    onChange({ province: name, city: "", subdistrict: "", village: "" });
  };

  const handleReg = (e) => {
    const id   = e.target.value;
    const name = regencies.find((r) => getId(r) === id)?.name ?? "";
    setRegId(id); setDistId("");
    onChange({ city: name, subdistrict: "", village: "" });
  };

  const handleDist = (e) => {
    const id   = e.target.value;
    const name = districts.find((d) => getId(d) === id)?.name ?? "";
    setDistId(id);
    onChange({ subdistrict: name, village: "" });
  };

  const handleVil = (e) => {
    const name = villages.find((v) => getId(v) === e.target.value)?.name ?? "";
    onChange({ village: name });
  };

  return (
    <>
      {/* Provinsi */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Provinsi{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <select value={provId} onChange={handleProv}
            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5
              text-sm outline-none bg-white pr-9 text-gray-800 transition
              focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]">
            <option value="">Pilih provinsi</option>
            {PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4 absolute right-3 top-1/2
            -translate-y-1/2 text-gray-400 pointer-events-none">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Kabupaten/Kota */}
      <WDD label="Kabupaten/Kota" required={required}
        value={value.city ?? ""} onChange={handleReg}
        opts={regencies} loading={loadingReg}
        disabled={!provId} placeholder="Pilih kabupaten/kota" error={errReg} />

      {/* Kecamatan */}
      <WDD label="Kecamatan" required={required}
        value={value.subdistrict ?? ""} onChange={handleDist}
        opts={districts} loading={loadingDist}
        disabled={!regId} placeholder="Pilih kecamatan" error={errDist} />

      {/* Kelurahan/Desa */}
      <WDD label="Kelurahan/Desa" required={required}
        value={value.village ?? ""} onChange={handleVil}
        opts={villages} loading={loadingVil}
        disabled={!distId} placeholder="Pilih kelurahan/desa" error={errVil} />
    </>
  );
}