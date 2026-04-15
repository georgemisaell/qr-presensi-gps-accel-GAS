📱 QR Presensi 

📌 Deskripsi
QR Presensi merupakan aplikasi berbasis web yang digunakan untuk sistem presensi (absensi) digital dengan memanfaatkan teknologi QR Code dan GPS. Aplikasi ini memungkinkan mahasiswa melakukan check-in secara cepat dan akurat, serta menyediakan fitur monitoring bagi admin melalui dashboard interaktif.
Aplikasi dikembangkan menggunakan React dan Vite dengan konsep Single Page Application (SPA), sehingga memberikan performa yang cepat, efisien, dan responsif.


📄Tujuan Pengembangan
Menggantikan sistem presensi manual menjadi digital
Meningkatkan efisiensi dan kecepatan proses absensi
Mengurangi potensi kecurangan dalam presensi
Mengintegrasikan teknologi QR Code dan GPS dalam satu platform
Menyediakan dashboard monitoring berbasis web


📄Fitur Utama
👨‍🎓 Mahasiswa
Melakukan scan QR Code untuk presensi
Check-in kehadiran secara real-time
Mengakses halaman dashboard mahasiswa

👨‍💼 Admin
Monitoring data presensi pengguna
Mengelola tampilan dashboard
Mengakses menu khusus admin

📍 GPS Tracking
Mengambil lokasi pengguna saat presensi
Validasi lokasi untuk memastikan kehadiran yang valid
Integrasi dengan peta digital

📊 Dashboard
Menampilkan data dalam bentuk visual
Navigasi berbasis role (admin / mahasiswa)
Menu terstruktur untuk tiap fitur

📱 Accelerometer
Mengakses sensor perangkat pengguna
Digunakan untuk fitur tambahan berbasis pergerakan

🛠️ Teknologi yang Digunakan
Teknologi	Fungsi
React	Framework frontend
Vite	Build tool & development server
Chart.js	Visualisasi data
html5-qrcode	Scan QR Code
Leaflet & React-Leaflet	Peta dan GPS
React Router DOM	Navigasi halaman


📂 Struktur Folder Project (Detail)
src/
 ├── assets/  
 │   → Menyimpan file statis seperti gambar dan resource lainnya
 │
 ├── pages/
 │   ├── dashboard/
 │   │   → Halaman utama setelah user masuk (berisi menu navigasi)
 │   │
 │   ├── admin/
 │   │   → Halaman khusus admin untuk pengelolaan sistem
 │   │
 │   ├── accel/
 │   │   → Fitur pembacaan sensor accelerometer perangkat
 │   │
 │   ├── accel-admin/
 │   │   → Kombinasi fitur admin dan sensor accelerometer
 │   │
 │   ├── checkin/
 │   │   → Halaman utama untuk scan QR Code (presensi)
 │   │
 │   ├── gps/
 │   │   → Halaman untuk tracking dan validasi lokasi pengguna
 │
 ├── Api.jsx
 │   → Konfigurasi endpoint API (komunikasi frontend-backend)
 │
 ├── App.jsx
 │   → Root component (pengatur routing utama aplikasi)
 │
 ├── main.jsx
 │   → Entry point aplikasi React
 │
 ├── index.css
 │   → Styling global aplikasi


⚙️ Cara Instalasi & Menjalankan Project
1. Clone Repository
git clone https://github.com/georgemisaell/qr-presensi-frontend.git
cd qr-presensi-frontend
2. Install Dependency
npm install
3. Jalankan Project
npm run dev
4. Akses Aplikasi

Buka browser dan akses:
http://localhost:5173


🔄 Alur Sistem Aplikasi
User membuka aplikasi melalui browser
User masuk ke halaman dashboard
Mahasiswa memilih menu check-in
Sistem mengaktifkan kamera untuk scan QR Code
Data presensi dikirim ke sistem
Lokasi pengguna diambil menggunakan GPS
Sistem melakukan validasi lokasi
Data tersimpan dan dapat dipantau oleh admin


📊 Analisis Sistem
Sistem berbasis client-side rendering (React)
Menggunakan REST API untuk komunikasi data
Mengintegrasikan hardware device (kamera & GPS)
Mendukung multi-role (admin & mahasiswa)