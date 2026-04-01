import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { checkIn } from "../Api";
import "./CheckIn.css";

export default function CheckIn() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("Siap untuk memulai scan.");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []);

  const stopScannerIfNeeded = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
    } catch {
      // Ignore stop errors when scanner is already stopped.
    }
    scannerRef.current.clear();
    scannerRef.current = null;
  };

  const startScanner = async () => {
    const normalizedUserId = userId.trim();
    const normalizedCourseId = courseId.trim();
    const normalizedSessionId = sessionId.trim();
    if (!normalizedUserId) {
      alert("Masukkan User ID terlebih dahulu");
      return;
    }
    if (!normalizedCourseId || !normalizedSessionId) {
      alert("Masukkan Course ID dan Session ID terlebih dahulu");
      return;
    }

    setStatus("Mengaktifkan kamera...");
    setIsScanning(true);

    await stopScannerIfNeeded();

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScannerIfNeeded();

          const deviceId =
            localStorage.getItem("device_id") || generateDeviceId();

          setStatus("Mengirim data presensi...");
          try {
            const res = await checkIn({
              user_id: normalizedUserId,
              device_id: deviceId,
              course_id: normalizedCourseId,
              session_id: normalizedSessionId,
              qr_token: String(decodedText || "").trim(),
              ts: new Date().toISOString(),
            });

            if (res.ok) {
              setStatus("Check-in sukses. Status: checked_in");
            } else {
              setStatus("Gagal: " + res.error);
            }
          } catch {
            setStatus("Server error. Gagal menghubungi API.");
          } finally {
            setIsScanning(false);
          }
        },
        () => {},
      );
    } catch {
      setStatus("Gagal mengakses kamera. Pastikan izin diberikan.");
      setIsScanning(false);
    }
  };

  const generateDeviceId = () => {
    const id =
      "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("device_id", id);
    return id;
  };

  const getStatusClass = () => {
    if (
      status.toLowerCase().includes("berhasil") ||
      status.toLowerCase().includes("sukses") ||
      status.toLowerCase().includes("checked_in")
    ) {
      return "status-success";
    }
    if (
      status.toLowerCase().includes("gagal") ||
      status.toLowerCase().includes("error")
    ) {
      return "status-error";
    }
    if (isScanning || status.toLowerCase().includes("meng"))
      return "status-loading";
    return "status-default";
  };

  return (
    <div className="checkin-page">
      <div className="checkin-top-nav">
        <button
          className="checkin-back-btn"
          type="button"
          onClick={() => navigate("/")}
        >
          Kembali ke Dashboard
        </button>
      </div>

      <div className="checkin-card fade-in">
        <h2 className="checkin-title">Scan QR Presensi</h2>
        <p className="checkin-subtitle">
          Masukkan User ID, Course ID, Session ID lalu scan QR dari dosen.
        </p>
        <div className="checkin-layout">
          <section className="checkin-panel">
            <label className="checkin-field" htmlFor="user-id-input">
              User ID Mahasiswa
            </label>
            <input
              id="user-id-input"
              className="checkin-input"
              placeholder="Contoh: 2023xxxx"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />

            <label className="checkin-field" htmlFor="course-id-input">
              Course ID
            </label>
            <input
              id="course-id-input"
              className="checkin-input"
              placeholder="Contoh: cloud-101"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />

            <label className="checkin-field" htmlFor="session-id-input">
              Session ID
            </label>
            <input
              id="session-id-input"
              className="checkin-input"
              placeholder="Contoh: sesi-01"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />

            <button
              className="checkin-scan-btn"
              type="button"
              onClick={startScanner}
              disabled={isScanning}
            >
              {isScanning ? "Memulai Kamera..." : "Mulai Scan QR"}
            </button>

            <p className={`checkin-status ${getStatusClass()}`}>{status}</p>
          </section>

          <section className="reader-wrapper">
            <div id="reader" className="reader-box" />
          </section>
        </div>
      </div>
    </div>
  );
}
