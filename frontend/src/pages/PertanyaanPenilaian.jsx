import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
​
/**
 * PertanyaanPenilaian — CRUD pertanyaan penilaian (feedback question).
 * Dipakai bersama oleh Admin & Super Admin.
 *
 * Endpoint (RequireRole admin + superadmin):
 *   GET    /admin/feedbacks/questions       -> { questions: [{ id, question_text, is_active }] }
 *   POST   /admin/feedbacks/questions       -> body ARRAY [{ question_text, is_active }]
 *   PATCH  /admin/feedbacks/questions/:id   -> body { question_text, is_active }
 *   DELETE /admin/feedbacks/questions/:id
 */
export default function PertanyaanPenilaian() {
  const navigate = useNavigate();
​
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
​
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
​
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
​
  const [busyId, setBusyId] = useState(null);
​
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/feedbacks/questions");
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error ?? j.message ?? "Gagal memuat pertanyaan.");
      setQuestions(j.questions ?? []);
    } catch (e) {
      setError(e.message ?? "Gagal memuat pertanyaan.");
    } finally {
      setLoading(false);
    }
  };
​
  useEffect(() => {
    load();
  }, []);
​
  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };
​
  const handleAdd = async () => {
    if (!newText.trim()) return setError("Pertanyaan tidak boleh kosong.");
    setAdding(true);
    setError("");
    try {
      const res = await apiFetch("/admin/feedbacks/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ question_text: newText.trim(), is_active: true }]),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error ?? j.message ?? "Gagal menambah pertanyaan.");
      setNewText("");
      flash("Pertanyaan berhasil ditambahkan.");
      load();
    } catch (e) {
      setError(e.message ?? "Gagal menambah pertanyaan.");
    } finally {
      setAdding(false);
    }
  };
​
  const startEdit = (q) => {
    setEditId(q.id);
    setEditText(q.question_text);
    setError("");
  };
​
  const handleSaveEdit = async (q) => {
    if (!editText.trim()) return setError("Pertanyaan tidak boleh kosong.");
    setSavingEdit(true);
    setError("");
    try {
      const res = await apiFetch(`/admin/feedbacks/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: editText.trim(),
          is_active: q.is_active,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error ?? j.message ?? "Gagal menyimpan perubahan.");
      setEditId(null);
      setEditText("");
      flash("Pertanyaan berhasil diperbarui.");
      load();
    } catch (e) {
      setError(e.message ?? "Gagal menyimpan perubahan.");
    } finally {
      setSavingEdit(false);
    }
  };
​
  const handleToggleActive = async (q) => {
    setBusyId(q.id);
    setError("");
    try {
      const res = await apiFetch(`/admin/feedbacks/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: q.question_text,
          is_active: !q.is_active,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error ?? j.message ?? "Gagal mengubah status.");
      flash(
        !q.is_active
          ? "Pertanyaan diaktifkan."
          : "Pertanyaan dinonaktifkan."
      );
      load();
    } catch (e) {
      setError(e.message ?? "Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  };
​
  const handleDelete = async (q) => {
    if (!window.confirm(`Hapus pertanyaan ini?\n\n"${q.question_text}"`)) return;
    setBusyId(q.id);
    setError("");
    try {
      const res = await apiFetch(`/admin/feedbacks/questions/${q.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? j.message ?? "Gagal menghapus pertanyaan.");
      }
      flash("Pertanyaan berhasil dihapus.");
      load();
    } catch (e) {
      setError(e.message ?? "Gagal menghapus pertanyaan.");
    } finally {
      setBusyId(null);
    }
  };
​
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#233B6E] transition-colors"
          title="Kembali"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#233B6E]">
            Kelola Pertanyaan Penilaian
          </h1>
          <p className="text-sm text-gray-500">
            Tambah, ubah, atau hapus pertanyaan yang muncul di formulir penilaian
            pelanggan.
          </p>
        </div>
      </div>
​
      {notice && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
​
      {/* Tambah pertanyaan */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <h2 className="font-bold text-[#233B6E] text-sm mb-3">
          Tambah Pertanyaan Baru
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Tulis pertanyaan penilaian, mis. 'Bagaimana keramahan petugas?'"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-[#F6F7FB] outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] text-gray-700 placeholder-gray-400"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {adding ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </div>
​
      {/* Daftar pertanyaan */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#233B6E] text-sm">Daftar Pertanyaan</h2>
          <span className="text-xs text-gray-400">
            {questions.length} pertanyaan
          </span>
        </div>
​
        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Memuat...</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Belum ada pertanyaan. Tambahkan pertanyaan pertama Anda di atas.
          </p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q, idx) => (
              <li
                key={q.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl px-4 py-3"
              >
                <span className="w-6 text-sm font-bold text-gray-300">
                  {idx + 1}
                </span>
​
                {editId === q.id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F6F7FB] outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] text-gray-700"
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-700">
                    {q.question_text}
                  </span>
                )}
​
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    q.is_active
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {q.is_active ? "Aktif" : "Nonaktif"}
                </span>
​
                <div className="flex items-center gap-1.5">
                  {editId === q.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(q)}
                        disabled={savingEdit}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#233B6E] text-white hover:bg-[#1a2d56] disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => {
                          setEditId(null);
                          setEditText("");
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleActive(q)}
                        disabled={busyId === q.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        title={q.is_active ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {q.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-[#233B6E] hover:bg-gray-50"
                        title="Edit"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4"
                        >
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={busyId === q.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Hapus"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}