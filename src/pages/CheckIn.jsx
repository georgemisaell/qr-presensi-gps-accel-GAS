import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { checkIn } from "../Api";
import "./CheckIn.css";

export default function CheckIn() {
  const navigate = useNavigate();
  const [nim, setNim] = useState("");
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
    } catch (_error) {
      // Ignore stop errors when scanner is already stopped.
    }
    scannerRef.current.clear();
    scannerRef.current = null;
  };

  const startScanner = async () => {
    if (!nim.trim()) {
      alert("Masukkan NIM terlebih dahulu");
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
              user_id: nim,
              nim,
              device_id: deviceId,
              qr_token: decodedText,
              ts: new Date().toISOString(),
            });

            if (res.ok) {
              setStatus("Presensi berhasil disubmit!");
            } else {
              setStatus("Gagal: " + res.error);
            }
          } catch (_error) {
            setStatus("Server error. Gagal menghubungi API.");
          } finally {
            setIsScanning(false);
          }
        },
        () => {},
      );
    } catch (_error) {
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
    if (status.toLowerCase().includes("berhasil")) return "status-success";
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
          Masukkan NIM lalu scan QR dari dosen/admin.
        </p>
        <div className="checkin-layout">
          <section className="checkin-panel">
            <label className="checkin-field" htmlFor="nim-input">
              NIM Mahasiswa
            </label>
            <input
              id="nim-input"
              className="checkin-input"
              placeholder="Contoh: 2205112345"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
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
