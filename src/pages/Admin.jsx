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

const markerColors = [
  "red",
  "blue",
  "green",
  "orange",
  "violet",
  "gold",
  "black"
];

const getColorByDevice = (deviceId) => {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return markerColors[Math.abs(hash) % markerColors.length];
};

const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

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

  const openGpsModal = async () => {
    setIsModalOpen(true);
    try {
      const query = new URLSearchParams({
        path: "sensor/gps/logs",
        _t: String(Date.now()),
      });
      const resp = await fetch(`${BASE_URL}?${query.toString()}`, {
        cache: "no-store",
      });
      const json = await resp.json();
      if (json.ok) {
        setGpsLogs(Array.isArray(json.data) ? json.data : []);
      } else {
        setGpsLogs([]);
      }
    } catch (error) {
      console.error(error);
      setGpsLogs([]);
    }
  };

  const scannedClients = useMemo(() => {
    const latestByDevice = new Map();

    gpsLogs.forEach((item) => {
      const deviceId = item.device_id || item.user_id || item.nim || "Unknown";
      if (!latestByDevice.has(deviceId)) {
        latestByDevice.set(deviceId, {
          ...item,
          clientLabel: item.nim || item.user_id || item.device_id || "Unknown",
        });
      }
    });

    return Array.from(latestByDevice.values());
  }, [gpsLogs]);

  const mapPoints = useMemo(() => {
    return scannedClients
      .filter((item) => item.lat && item.lng)
      .map((item) => ({
        ...item,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }, [scannedClients]);

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
                  <th>Action</th>
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
                    <td>
                      <button
                        className="btn-row-delete"
                        title="Hapus presensi"
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

      {/* Modal GPS */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Peta Pantauan Semua Klien</h3>
              <button
                className="btn btn-close"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Tutup
              </button>
            </div>
            <p className="modal-subtitle">
              Menampilkan {scannedClients.length} klien terbaru yang sudah
              mengirim scan/GPS.
            </p>
            <div className="modal-map-wrap">
              <MapContainer
                center={[-6.2, 106.8]}
                zoom={12}
                className="gps-map"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoFitMap points={mapPoints} />
                {mapPoints.map((d, i) => {
                  const deviceId = d.device_id || d.clientLabel || "unknown";
                  const color = getColorByDevice(deviceId);
                  const icon = createColoredIcon(color);

                  return (
                    <Marker key={i} position={[d.lat, d.lng]} icon={icon}>
                    <Popup>
                      {d.clientLabel}
                      {d.waktu
                        ? ` - ${new Date(d.waktu).toLocaleString()}`
                        : ""}
                    </Popup>
                  </Marker>
                  )}
                )}
              </MapContainer>
              <div className="map-legend">
                {mapPoints.map((d, i) => {
                  const deviceId = d.device_id || d.clientLabel || "unknown";
                  const color = getColorByDevice(deviceId);

                  return (
                    <div key={i} className="legend-item">
                      <span
                        className="legend-color"
                        style={{ background: color }}
                      ></span>
                      {deviceId}
                    </div>
                  );
                })}
              </div>
            </div>
            {scannedClients.length > 0 && (
              <div className="modal-client-list">
                {scannedClients.map((client, index) => (
                  <div
                    key={`${client.clientLabel}-${index}`}
                    className="modal-client-item"
                  >
                    <div>
                      <p className="modal-client-name">{client.clientLabel}</p>
                      <p className="modal-client-time">
                        {client.waktu
                          ? new Date(client.waktu).toLocaleString()
                          : "Waktu tidak tersedia"}
                      </p>
                    </div>
                    {client.lat && client.lng ? (
                      <a
                        className="modal-client-link"
                        href={`https://www.google.com/maps?q=${client.lat},${client.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Buka Maps
                      </a>
                    ) : (
                      <span className="modal-client-muted">
                        Tanpa koordinat
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
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
