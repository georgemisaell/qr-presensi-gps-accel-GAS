# 🚀 QR Presensi

## 📌 Deskripsi

QR Presensi merupakan aplikasi berbasis web yang digunakan untuk sistem presensi (absensi) digital dengan memanfaatkan teknologi QR Code dan GPS. Aplikasi ini memungkinkan mahasiswa melakukan check-in secara cepat dan akurat, serta menyediakan fitur monitoring bagi admin melalui dashboard interaktif. Aplikasi dikembangkan menggunakan React dan Vite dengan konsep Single Page Application (SPA) untuk performa yang cepat dan efisien.

---

## 🎯 Tujuan Pengembangan

* Menggantikan sistem presensi manual menjadi digital
* Meningkatkan efisiensi dan kecepatan proses absensi
* Mengurangi potensi kecurangan dalam presensi
* Mengintegrasikan teknologi QR Code dan GPS dalam satu platform
* Menyediakan dashboard monitoring berbasis web

---

## ⚙️ Fitur Utama

### 👨‍🎓 Mahasiswa

* Melakukan scan QR Code untuk presensi
* Check-in kehadiran secara real-time
* Validasi lokasi menggunakan GPS
* Akses dashboard mahasiswa

### 🧑‍💼 Admin

* Monitoring data presensi pengguna
* Mengelola tampilan dashboard
* Akses menu khusus admin

### 📍 GPS Tracking

* Mengambil lokasi pengguna saat presensi
* Validasi lokasi untuk memastikan kehadiran yang valid
* Integrasi dengan peta digital

### 📊 Dashboard

* Menampilkan data presensi dalam bentuk visual
* Navigasi berbasis role (admin & mahasiswa)
* Tampilan UI yang terstruktur

### 📱 Accelerometer

* Mengakses sensor perangkat pengguna
* Digunakan untuk fitur tambahan berbasis pergerakan

---

## 🧰 Teknologi yang Digunakan

* React (Frontend Framework)
* Vite (Build Tool & Development Server)
* JavaScript
* HTML & CSS
* React Router DOM (Navigasi)
* Leaflet (Peta & GPS)
* QR Code Scanner

---

## 📁 Struktur Folder Project

```bash
src/
├── assets/                # Menyimpan file statis (gambar, dll)
├── pages/                 # Halaman aplikasi
│   ├── dashboard/         # Halaman dashboard
│   ├── login/             # Halaman login
│   ├── checkin/           # Halaman untuk scan QR
├── components/            # Komponen reusable
├── hooks/                 # Custom hooks
├── App.jsx                # Root component
├── main.jsx               # Entry point aplikasi
├── index.css              # Styling global
```

---

## 🛠️ Cara Instalasi & Menjalankan Project

### 1. Clone Repository

```bash
git clone https://github.com/georgemisael/qr-presensi-frontend.git
cd qr-presensi-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Project

```bash
npm run dev
```

---

## 🌐 Akses Aplikasi

Buka browser dan akses:

```
http://localhost:5173
```

---

## 🔄 Alur Sistem Aplikasi

1. User (Mahasiswa) login ke sistem
2. Masuk ke dashboard mahasiswa
3. Memilih menu check-in
4. Scan QR Code yang tersedia
5. Sistem mengambil lokasi GPS
6. Validasi lokasi dilakukan
7. Data presensi dikirim ke server
8. Admin dapat melihat hasil presensi di dashboard

---

## 🧠 Analisis Sistem

* Sistem berbasis client-side rendering (React)
* Menggunakan REST API untuk komunikasi data
* Mengintegrasikan hardware device:

  * Kamera (QR Scanner)
  * GPS (Lokasi)
* Mendukung multi-role (Admin & Mahasiswa)

---

## 📌 Catatan

* Pastikan GPS aktif saat melakukan presensi
* Gunakan browser yang mendukung akses kamera
* Koneksi internet diperlukan untuk komunikasi dengan server


