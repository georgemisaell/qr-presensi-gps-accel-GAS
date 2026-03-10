import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
// Pastikan kamu punya fungsi sendGps di file Api.js kamu yang mengarah ke path "sensor/gps"
import { checkIn, sendGps } from "../Api";

export default function CheckIn() {
  const [nim, setNim] = useState("");
  const [status, setStatus] = useState("");
  const scannerRef = useRef(null);

  // Membersihkan scanner jika komponen di-unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []);

  // Fungsi helper untuk mengambil koordinat GPS
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolokasi tidak didukung oleh browser ini.");
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(
            "Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  };

  const startScanner = async () => {
    if (!nim) {
      alert("Masukkan NIM terlebih dahulu");
      return;
    }

    setStatus("📷 Mengaktifkan kamera...");

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
    }

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // 1. Hentikan kamera segera setelah QR terbaca
          if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            scannerRef.current = null;
          }

          const deviceId =
            localStorage.getItem("device_id") || generateDeviceId();

          // 2. Ambil Koordinat GPS
          setStatus("📍 Sedang mendapatkan lokasi GPS...");
          try {
            const coords = await getLocation();
            const gpsPayload = {
              device_id: deviceId,
              lat: coords.lat,
              lng: coords.lng,
              accuracy: coords.accuracy,
              ts: new Date().toISOString(),
            };

            // Kirim data GPS ke backend (Sheet 'gps')
            await sendGps(gpsPayload);
          } catch (gpsError) {
            console.warn(gpsError);
            alert(
              "Peringatan: Lokasi GPS tidak terdeteksi, tapi presensi akan tetap dilanjutkan.",
            );
            // Catatan: Kamu bisa mengubah logika ini menjadi 'return' jika ingin
            // mahasiswa WAJIB punya GPS aktif untuk bisa absen.
          }

          // 3. Kirim Data Presensi
          setStatus("⏳ Mengirim data presensi...");
          const presencePayload = {
            user_id: nim,
            nim: nim,
            device_id: deviceId,
            qr_token: decodedText,
            ts: new Date().toISOString(),
          };

          try {
            const res = await checkIn(presencePayload);

            if (res.ok) {
              setStatus("✅ Presensi berhasil disubmit!");
            } else {
              setStatus("❌ Gagal: " + res.error);
            }
          } catch (err) {
            setStatus("❌ Server error. Gagal menghubungi API.");
          }
        },
        () => {
          // Callback frame kosong, biarkan saja
        },
      );
    } catch (err) {
      setStatus("❌ Gagal mengakses kamera. Pastikan izin diberikan.");
    }
  };

  function generateDeviceId() {
    const id =
      "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("device_id", id);
    return id;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Scan QR Presensi</h2>

        <input
          style={styles.input}
          placeholder="Masukkan NIM"
          value={nim}
          onChange={(e) => setNim(e.target.value)}
        />

        <button style={styles.button} onClick={startScanner}>
          Mulai Scan QR
        </button>

        <div id="reader" style={{ marginTop: 20, width: "100%" }}></div>

        <p style={styles.status}>{status}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f1f5f9",
  },
  card: {
    background: "white",
    padding: 30,
    borderRadius: 16,
    width: 350,
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  input: {
    width: "90%",
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  status: { marginTop: 15, fontWeight: "bold", color: "#334155" },
};
