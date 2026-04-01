import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminMenu } from "./menu/AdminMenu";
import "./Dashboard.css";
import { MahasiswaMenu } from "./menu/MahasiswaMenu";
import { AccelMenu } from "./menu/AccelMenu";
import { GpsMenu } from "./menu/GpsMenu";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setIsLoading(true);
    setTimeout(() => {
      navigate(path);
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

          {/* Tombol GPS (placeholder) */}
          <GpsMenu handleNavigation={handleNavigation} />
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
