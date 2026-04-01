export function GpsMenu({ handleNavigation }) {
  return (
    <div className="menu-btn" onClick={() => handleNavigation("/gps")}>
      <div className="menu-icon">🛰️</div>
      <h3>GPS</h3>
      <p>Menu GPS disiapkan untuk tahap berikutnya.</p>
    </div>
  );
}
