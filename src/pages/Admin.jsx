import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import "./Admin.css";
import { BASE_URL } from "../Api";

export default function Admin() {
  const QR_ROTATION_SECONDS = 20;
  const navigate = useNavigate();
  const [course, setCourse] = useState("WEB-101");
  const [session, setSession] = useState("SESI-01");
  const [qrToken, setQrToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [isQrAutoRunning, setIsQrAutoRunning] = useState(false);
  const [presenceData, setPresenceData] = useState([]);
  const [presenceError, setPresenceError] = useState("");
  const [isFetchingPresence, setIsFetchingPresence] = useState(false);
  const [loading, setLoading] = useState(false);

  const courseOptions = [{ value: "cloud-101", label: "Cloud Computing" }];

  const sessionOptions = [{ value: "sesi-02", label: "Sesi 2" }];

  const resetView = () => {
    setIsQrAutoRunning(false);
    setQrToken("");
    setTimeLeft(null);
  };

  const fetchPresence = useCallback(async () => {
    const courseId = course.trim();
    const sessionId = session.trim();

    if (!courseId || !sessionId) {
      setPresenceData([]);
      setPresenceError("Course ID dan Session ID wajib diisi.");
      return;
    }

    setIsFetchingPresence(true);
    setPresenceError("");

    try {
      const query = new URLSearchParams({
        path: "admin/presence/list",
        course_id: courseId,
        session_id: sessionId,
        _t: String(Date.now()),
      });
      const resp = await fetch(`${BASE_URL}?${query.toString()}`, {
        cache: "no-store",
      });
      const json = await resp.json();
      if (json.ok) {
        setPresenceData(Array.isArray(json.data) ? json.data : []);
      } else {
        setPresenceData([]);
        setPresenceError(
          json.error ||
            "Backend mengembalikan error saat mengambil daftar presensi.",
        );
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setPresenceData([]);
      setPresenceError(
        "Gagal menghubungi backend. Cek deployment Apps Script dan izin akses Web App.",
      );
    } finally {
      setIsFetchingPresence(false);
    }
  }, [course, session]);

  // Auto-update tabel presensi setiap 5 detik
  useEffect(() => {
    const interval = setInterval(fetchPresence, 5000);
    fetchPresence();
    return () => clearInterval(interval);
  }, [fetchPresence]);

  // Timer Countdown
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const generateQR = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}?path=presence/qr/generate`, {
        method: "POST",
        body: JSON.stringify({ course_id: course, session_id: session }),
      });
      const json = await resp.json();
      if (json.ok) {
        setQrToken(json.data.qr_token);
        setTimeLeft(QR_ROTATION_SECONDS);
        return true;
      }
      alert(json.error || "Gagal generate QR");
    } catch (_error) {
      alert("Gagal generate QR");
      setIsQrAutoRunning(false);
    } finally {
      setLoading(false);
    }
    return false;
  }, [QR_ROTATION_SECONDS, course, session]);

  useEffect(() => {
    if (!isQrAutoRunning || timeLeft !== 0) return;

    generateQR();
  }, [generateQR, isQrAutoRunning, timeLeft]);

  const startQrRotation = async () => {
    const created = await generateQR();
    if (created) {
      setIsQrAutoRunning(true);
    }
  };

  const stopQrRotation = () => {
    setIsQrAutoRunning(false);
    setQrToken("");
    setTimeLeft(null);
  };

  const deletePresence = async (nim) => {
    if (!window.confirm(`Hapus presensi untuk NIM ${nim}?`)) return;
    // Optimistic update
    setPresenceData((prev) => prev.filter((row) => row.nim !== nim));
    try {
      const resp = await fetch(`${BASE_URL}?path=admin/presence/delete`, {
        method: "POST",
        body: JSON.stringify({
          nim,
          course_id: course.trim(),
          session_id: session.trim(),
        }),
      });
      const json = await resp.json();
      if (!json.ok) {
        alert(json.error || "Gagal menghapus presensi.");
        fetchPresence(); // rollback
      }
    } catch (_err) {
      alert("Gagal terhubung ke server.");
      fetchPresence(); // rollback
    }
  };

  const visiblePresence = useMemo(() => {
    return presenceData.map((row) => ({
      ...row,
      status: "checked_in",
    }));
  }, [presenceData]);

  return (
    <div className="admin-container">
      <div className="top-nav">
        <button className="btn-back" onClick={() => navigate("/")}>
          🔙 Kembali
        </button>
      </div>

      <div className="main-wrapper">
        {/* Kontrol QR */}
        <div className="admin-card">
          <h2>📋 Admin Presensi</h2>
          <p className="admin-subtitle">
            Atur kelas dan sesi untuk menampilkan data.
          </p>
          <div className="admin-controls-row">
            <label className="admin-field">
              <span className="admin-field-label">Mata Kuliah</span>
              <span className="admin-field-control">
                <span className="admin-field-icon">#</span>
                <select
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    resetView();
                  }}
                  className="input-select"
                >
                  {courseOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Sesi / Pertemuan</span>
              <span className="admin-field-control">
                <span className="admin-field-icon">@</span>
                <select
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    resetView();
                  }}
                  className="input-select"
                >
                  {sessionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>

          <div className={`qr-box ${qrToken ? "active" : ""}`}>
            {qrToken ? (
              <div
                className={`qr-image-wrap ${timeLeft === 0 ? "is-expired" : ""}`}
              >
                <QRCodeCanvas value={qrToken} size={200} />
              </div>
            ) : (
              <p>Klik Generate QR</p>
            )}
          </div>

          {timeLeft > 0 && (
            <p className="countdown-text">
              Token berganti otomatis dalam {timeLeft} detik.
            </p>
          )}
          {!isQrAutoRunning && qrToken && (
            <p className="expired-text">
              QR dihentikan. Tekan mulai untuk generate lagi.
            </p>
          )}
          <p className="qr-status-text">
            {isQrAutoRunning
              ? "Mode otomatis aktif. Token baru dibuat setiap 20 detik."
              : "Mode otomatis nonaktif. QR tidak sedang diputar."}
          </p>

          <button
            className="btn btn-primary"
            onClick={startQrRotation}
            disabled={loading || isQrAutoRunning}
          >
            {loading ? "Memproses..." : "Mulai QR Otomatis"}
          </button>
          <button
            className="btn btn-danger"
            onClick={stopQrRotation}
            disabled={!qrToken && !isQrAutoRunning}
          >
            Stop QR Token
          </button>
        </div>

        {/* Tabel Presensi */}
        <div className="admin-card admin-card-table">
          <h3>Data Presensi ({presenceData.length})</h3>
          {presenceError && <p className="fetch-error">{presenceError}</p>}
          {!presenceError && isFetchingPresence && (
            <p className="fetch-info">Memuat data presensi...</p>
          )}
          {!presenceError &&
            !isFetchingPresence &&
            presenceData.length === 0 && (
              <p className="fetch-info">
                Belum ada data untuk Course/Session ini. Pastikan nilainya
                persis sama dengan data di spreadsheet.
              </p>
            )}
          <div className="table-wrapper">
            <table className="presence-table">
              <thead>
                <tr>
                  <th>NIM</th>
                  <th>User ID</th>
                  <th>Status</th>
                  <th>Waktu</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visiblePresence.map((row, i) => (
                  <tr key={i}>
                    <td>{row.nim}</td>
                    <td>{row.user_id || row.nim}</td>
                    <td>{row.status}</td>
                    <td>{new Date(row.waktu).toLocaleTimeString()}</td>
                    <td>
                      <button
                        className="btn-row-delete"
                        title="Hapus presensi"
                        type="button"
                        onClick={() => deletePresence(row.nim)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
