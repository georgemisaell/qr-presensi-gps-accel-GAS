import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Admin.css";
import { BASE_URL } from "../Api";

// Fix icon leaflet yang sering hilang di React
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function AutoFitMap({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.lat, point.lng]),
    );
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 16,
      animate: true,
    });
  }, [map, points]);

  return null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [course, setCourse] = useState("WEB-101");
  const [session, setSession] = useState("SESI-01");
  const [qrToken, setQrToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [presenceData, setPresenceData] = useState([]);
  const [presenceError, setPresenceError] = useState("");
  const [isFetchingPresence, setIsFetchingPresence] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gpsLogs, setGpsLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const courseOptions = [
    { value: "WEB-101", label: "Pemrograman Web" },
    { value: "CLOUD-101", label: "Cloud Computing" },
    { value: "AI-201", label: "Machine Learning" },
    { value: "DB-301", label: "Basis Data" },
  ];

  const sessionOptions = [
    { value: "SESI-01", label: "Sesi 1" },
    { value: "SESI-02", label: "Sesi 2" },
    { value: "SESI-03", label: "Sesi 3" },
    { value: "SESI-UTS", label: "UTS" },
  ];

  const resetView = () => {
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

  const generateQR = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}?path=presence/qr/generate`, {
        method: "POST",
        body: JSON.stringify({ course_id: course, session_id: session }),
      });
      const json = await resp.json();
      if (json.ok) {
        setQrToken(json.data.qr_token);
        setTimeLeft(120); // 2 Menit
      }
    } catch (_error) {
      alert("Gagal generate QR");
    }
    setLoading(false);
  };

  const openGpsModal = async () => {
    setIsModalOpen(true);
    try {
      const query = new URLSearchParams({
        path: "admin/presence/list",
        course_id: course.trim(),
        session_id: session.trim(),
        _t: String(Date.now()),
      });
      const resp = await fetch(`${BASE_URL}?${query.toString()}`, {
        cache: "no-store",
      });
      const json = await resp.json();
      if (json.ok) setGpsLogs(json.data);
    } catch (error) {
      console.error(error);
      setGpsLogs([]);
    }
  };

  const mapPoints = useMemo(() => {
    const source = gpsLogs.length > 0 ? gpsLogs : presenceData;
    return source
      .filter((item) => item.lat && item.lng)
      .map((item) => ({
        ...item,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }, [gpsLogs, presenceData]);

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
              Sisa waktu: {Math.floor(timeLeft / 60)}:
              {timeLeft % 60 < 10 ? "0" : ""}
              {timeLeft % 60}
            </p>
          )}
          {timeLeft === 0 && <p className="expired-text">Token Expired!</p>}

          <button
            className="btn btn-primary"
            onClick={generateQR}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Generate QR Baru"}
          </button>
          <button className="btn btn-secondary" onClick={openGpsModal}>
            📍 Lihat Peta GPS
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
                  <th>Waktu</th>
                  <th>Map</th>
                </tr>
              </thead>
              <tbody>
                {presenceData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.nim}</td>
                    <td>{new Date(row.waktu).toLocaleTimeString()}</td>
                    <td>
                      {row.lat ? (
                        <a
                          href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📍 Lihat
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal GPS */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Peta Pantauan</h3>
              <button
                className="btn btn-close"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Tutup
              </button>
            </div>
            <div className="modal-map-wrap">
              <MapContainer
                center={[-6.2, 106.8]}
                zoom={12}
                className="gps-map"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoFitMap points={mapPoints} />
                {mapPoints.map((d, i) => (
                  <Marker key={i} position={[d.lat, d.lng]}>
                    <Popup>
                      {d.nim || d.user_id || "Unknown"}
                      {d.waktu
                        ? ` - ${new Date(d.waktu).toLocaleString()}`
                        : ""}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {mapPoints.length === 0 && (
              <p className="modal-empty">
                Belum ada data koordinat untuk ditampilkan.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
