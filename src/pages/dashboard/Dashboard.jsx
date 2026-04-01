import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminMenu } from "./menu/AdminMenu";
import "./Dashboard.css";
import { MahasiswaMenu } from "./menu/MahasiswaMenu";
import { AccelMenu } from "./menu/AccelMenu";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setIsLoading(true);

    // Memberikan sedikit efek delay agar transisi terasa halus
    setTimeout(() => {
      navigate(path);
      // Jika kamu TIDAK pakai react-router-dom, ganti baris di atas dengan:
      // window.location.href = path;
    }, 300);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card fade-in">
        <h1 className="dashboard-title">Portal Presensi</h1>
        <p className="dashboard-subtitle">
          Silakan pilih portal masuk sesuai dengan peran Anda
        </p>

        <div className="menu-grid">
          {/* Tombol Admin */}
          <AdminMenu handleNavigation={handleNavigation} />

          {/* Tombol Mahasiswa */}
          <MahasiswaMenu handleNavigation={handleNavigation} />

          {/* Tombol Accelerometer */}
          <AccelMenu handleNavigation={handleNavigation} />
        </div>

        {/* Teks Loading */}
        {isLoading && (
          <div className="loading-text fade-in">
            Sedang mengalihkan halaman...
          </div>
        )}
      </div>
    </div>
  );
}
