import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Admin from "./pages/Admin";
import Accelerometer from "./pages/Accelerometer";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rute "/" adalah halaman utama (saat web baru dibuka) */}
        <Route path="/" element={<Dashboard />} />

        <Route path="/admin" element={<Admin />} />

        {/* Rute "/client" akan membuka halaman Scan QR Mahasiswa */}
        <Route path="/client" element={<CheckIn />} />

        <Route path="/accelerometer" element={<Accelerometer />} />
      </Routes>
    </Router>
  );
}
