export function AccelMenu({ handleNavigation }) {
  return (
    <div
      className="menu-btn"
      onClick={() => handleNavigation("/accelerometer")}
    >
      <div className="menu-icon">📳</div>
      <h3>Accelerometer</h3>
      <p>Uji coba dan kirim data sensor pergerakan secara real-time.</p>
    </div>
  );
}
