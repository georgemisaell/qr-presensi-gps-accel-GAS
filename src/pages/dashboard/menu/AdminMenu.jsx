export function AdminMenu({ handleNavigation }) {
  return (
    <>
      <div className="menu-btn" onClick={() => handleNavigation("/admin")}>
        <div className="menu-icon">👨‍🏫</div>
        <h3>Dosen / Admin</h3>
        <p>Generate QR Code, kelola sesi kelas, dan pantau kehadiran.</p>
      </div>
    </>
  );
}
