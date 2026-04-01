export function GpsMenu({ handleNavigation }) {
  return (
    <div className="menu-btn" onClick={() => handleNavigation("/gps")}>
      <div className="menu-icon">🛰️</div>
      <h3>GPS</h3>
      <p>Kirim lokasi periodik, lihat marker terbaru, dan polyline history.</p>
    </div>
  );
}
