export function AdminMenu({ handleNavigation }) {
  return (
    <>
      <div className="menu-btn" onClick={() => handleNavigation("/admin")}>
        <div className="menu-icon">👨‍🏫</div>
        <h3>Dosen</h3>
        <p>Generate QR dinamis untuk sesi kuliah dan pantau kehadiran.</p>
      </div>
    </>
  );
}
