# Optimasi Rute Antar Rumah Sakit Kupang

Aplikasi web GIS untuk optimasi jaringan rute antar rumah sakit di Kota Kupang menggunakan **Algoritma Floyd-Warshall** dengan visualisasi graf berarah dan klasifikasi jalan arteri.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Flask](https://img.shields.io/badge/flask-2.0+-red.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

---

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Instalasi & Setup](#instalasi--setup)
- [Penggunaan](#penggunaan)
- [Algoritma Floyd-Warshall](#algoritma-floyd-warshall)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Tentang Proyek

Sistem optimasi rute jaringan rumah sakit untuk mendukung **rujukan medis**, **distribusi logistik**, dan **emergency response** di Kota Kupang menggunakan algoritma Floyd-Warshall untuk menemukan jalur terpendek antar semua pasangan rumah sakit.

### Masalah yang Diselesaikan

**Use Case Medis:**
- 🏥 **Rujukan Antar RS**: RS kecil merujuk pasien ke RS besar dengan rute optimal
- 🚑 **Distribusi Logistik**: Ambulans, obat-obatan, vaksin, dan darah
- 📊 **Analisis Jaringan**: Identifikasi RS dengan sentralitas tinggi (hub strategis)
- 🗺️ **Public Access**: Masyarakat dari lokasi custom bisa cari RS terdekat

### Solusi Teknis

- ✅ **12 Rumah Sakit** sebagai node dalam graf berarah
- ✅ **Floyd-Warshall Algorithm** untuk All-Pairs Shortest Path (132 pasangan)
- ✅ **Visualisasi Graf Berarah** dengan Canvas API (800×600px interaktif)
- ✅ **Klasifikasi Jalan Arteri** (Primer/Sekunder/Lokal) dengan color coding
- ✅ **Dual Mode**: Hospital-to-Hospital (preprocessed) & Custom Location (real-time)

---

## 🚀 Fitur Utama

### 1. Dual Mode System

#### Mode Hospital-to-Hospital (Floyd-Warshall)
- Rute optimal antar 12 RS menggunakan algoritma preprocessed
- Matriks 12×12 untuk distance & duration
- Path reconstruction menampilkan RS perantara
- Instant computation (< 1ms untuk 1,728 iterasi)

#### Mode Custom Location (Real-Time Routing)
- **15+ Lokasi Preset** terorganisir dalam kategori:
  - 🎓 **Kampus & Pendidikan**: Undana Penfui, Unkriswina, Poltek Kupang
  - 🚌 **Transportasi**: Bandara El Tari, Terminal Oebobo, Terminal Kota
  - 🛒 **Pusat Kota & Belanja**: Flobamora Mall, Lippo Plaza, Pasar Inpres, Pasar Oeba
  - 🏛️ **Perkantoran**: Kantor Gubernur NTT, Kantor Walikota
  - 🕌 **Tempat Ibadah**: Katedral Kupang, Masjid Raya
- **Klik Peta**: Pilih lokasi arbitrary dengan klik langsung di peta
- Direct routing ke RS terdekat via ORS API
- **User-friendly**: Tidak perlu input koordinat manual, cukup pilih dari dropdown

### 2. Visualisasi Graf Berarah
- **Canvas 800×600**: Node (RS) + Edge (jalan) + Panah (arah)
- **3 Mode Graf**:
  - Graf Berbobot: Tampilkan jarak (km) di setiap edge
  - Graf Sederhana: Struktur tanpa label
  - Highlight Jalur: Path berwarna hijau tebal hasil Floyd-Warshall
- **Interactive Controls**: Pilih RS asal-tujuan untuk visualisasi path

### 3. Klasifikasi Jalan Arteri
- 🔴 **Arteri Primer** (4 RS): Jalan utama kota (Jl. El Tari, Timor Raya)
- 🟠 **Arteri Sekunder** (4 RS): Jalan penghubung kawasan
- 🔵 **Jalan Lokal** (4 RS): Jalan lingkungan/perumahan
- Color-coded markers & edges untuk analisis aksesibilitas

### 4. Matriks & Tabel Interaktif
- **Matriks Jarak**: 12×12 symmetric matrix dengan hover tooltip
- **All-Pairs Table**: 132 pasangan dengan kolom Jalur, Jarak, Status
- **Badge "Tidak Langsung"**: Identifikasi jalur via perantara

### 5. Peta Interaktif (Leaflet.js)
- Polyline biru untuk rute hasil perhitungan
- Auto-zoom ke area rute
- Info panel: jarak, waktu, detail segment

---

## 🛠️ Teknologi

**Backend:** Python 3.8+ • Flask 2.0+ • Flask-CORS • Requests

**Frontend:** HTML5 • CSS3 • Vanilla JavaScript • Leaflet.js 1.9.4 • Canvas API

**External API:** OpenRouteService (Matrix API, Directions API)

**Algorithm:** Floyd-Warshall (O(n³) All-Pairs Shortest Path)

---

## 📦 Instalasi & Setup

### Prasyarat
- Python 3.8+ dengan pip
- Koneksi internet (untuk ORS API & Leaflet tiles)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd gis-rs-kupang

# 2. Setup virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 3. Install dependencies
cd backend
pip install -r requirements.txt

# 4. (Optional) Regenerate matrix data
cd scripts
python generate_matriks_ors.py

# 5. Run server
cd ..
python app.py
# Server berjalan di http://127.0.0.1:5000

# 6. Buka di browser
# http://127.0.0.1:5000
```

**File struktur penting:**
```
backend/
  ├── app.py                      # Flask server
  ├── requirements.txt            # Dependencies
  ├── data/
  │   ├── dataset_with_matrix.json   # Data 12 RS + matriks
  │   ├── distance_matrix.csv        # Matriks jarak
  │   └── duration_matrix.csv        # Matriks waktu
  └── scripts/
      └── generate_matriks_ors.py    # Generate matriks dari ORS

frontend/
  ├── index.html                  # Main UI
  ├── app.js                      # Main logic + Custom location
  ├── floydWarshall.js            # Floyd-Warshall implementation
  ├── graphVisualization.js       # Canvas graf berarah
  └── styles.css                  # Styling
```

---

## 📖 Penggunaan

### Mode 1: Hospital-to-Hospital (Floyd-Warshall)

1. **Pilih Rute**: Dropdown "Dari RS" dan "Ke RS"
2. **Hitung**: Klik "Hitung Rute Tercepat"
3. **Lihat Hasil**: Rute biru di peta + info jarak/waktu
4. **Eksplorasi**:
   - **Lihat Matriks Jarak**: Tabel 12×12 symmetric matrix
   - **Lihat Tabel All-Pairs**: 132 pasangan dengan detail jalur
   - **Lihat Graf Berarah**: Visualisasi canvas interaktif
     - Mode: Berbobot, Sederhana, Highlight Jalur
     - Pilih RS asal-tujuan untuk highlight path hijau

### Mode 2: Custom Location (Real-Time Routing)

1. **Switch Mode**: Pilih "Custom - Dari Lokasi Lain"
2. **Set Lokasi** (3 cara):
   - **Preset**: Pilih dari dropdown (Penfui, Terminal, Bandara, dll)
   - **Klik Peta**: Klik sembarang titik di peta Kupang
   - **Manual**: Input koordinat lat/lng → "Set Lokasi"
3. **Pilih RS Tujuan**: Dropdown RS
4. **Hitung Rute**: Direct routing dari custom point ke RS
5. **Reset**: Kembali ke mode hospital atau pilih lokasi baru

**Tips:**
- Custom mode cocok untuk emergency dari lokasi arbitrary
- Hospital mode cocok untuk analisis jaringan RS

---

## 🧮 Algoritma Floyd-Warshall

### Konsep Dasar

Algoritma **Dynamic Programming** untuk mencari jalur terpendek antara **semua pasangan vertex** (All-Pairs Shortest Path) dalam graf berbobot dengan kompleksitas **O(n³)**.

**Untuk 12 RS:** 12³ = **1,728 operasi** → < 1ms computation time

### Pseudocode

```plaintext
FloydWarshall(dist):
    n = jumlah vertex
    
    // Inisialisasi next matrix untuk path reconstruction
    for i = 0 to n-1:
        for j = 0 to n-1:
            if dist[i][j] < ∞:
                next[i][j] = j
    
    // Triple nested loop - core algorithm
    for k = 0 to n-1:              // Vertex perantara
        for i = 0 to n-1:          // Vertex asal
            for j = 0 to n-1:      // Vertex tujuan
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    next[i][j] = next[i][k]  // Update path
    
    return dist, next
```

### Implementasi JavaScript (Core)

```javascript
function floydWarshall(dist) {
    const n = dist.length;
    const next = Array.from({ length: n }, () => Array(n).fill(null));

    // Inisialisasi next matrix
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (dist[i][j] < Infinity) next[i][j] = j;
        }
    }

    // Triple loop: k = perantara, i = asal, j = tujuan
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }
    return { dist, next };
}

// Path Reconstruction
function reconstructPath(next, i, j) {
    if (next[i][j] === null) return [];
    let path = [i];
    while (i !== j) {
        i = next[i][j];
        path.push(i);
    }
    return path;  // [0, 3, 7, 11] - urutan RS yang dilalui
}
```

### Contoh Optimasi Real

**Sebelum Floyd-Warshall:**
```
RS A → RS B: 8.5 km (jalur langsung)
```

**Setelah Floyd-Warshall:**
```
RS A → RS C → RS B: 7.2 km (via perantara RS C)
HEMAT: 1.3 km (15%)
```

### Visualisasi Graf

Sistem ini memvisualisasikan algoritma dalam **3 mode**:

1. **Graf Berbobot**: Tampilkan bobot (jarak) di setiap edge
2. **Graf Sederhana**: Struktur graf tanpa label
3. **Highlight Jalur**: Path hasil Floyd-Warshall dengan warna hijau tebal

**Node positioning:** Circular layout untuk clarity (radius 250px)

**Edge rendering:** Directed arrows dengan color by klasifikasi jalan

---

## 🏥 Data Rumah Sakit (12 Lokasi)

| ID | Nama RS | Klasifikasi | Latitude | Longitude |
|----|---------|-------------|----------|-----------|
| 0 | RSUP Dr. Ben Mboi | 🔴 Arteri Primer | -10.220964 | 123.577964 |
| 1 | RSUD Prof. Dr. W. Z. Johannes | 🔴 Arteri Primer | -10.168121 | 123.585788 |
| 2 | RSAL Samuel J. Moeda | 🔴 Arteri Primer | -10.175598 | 123.555662 |
| 3 | RS Tk. III Wirasakti (TNI AD) | 🔴 Arteri Primer | -10.166161 | 123.583353 |
| 4 | RS Siloam Kupang | 🟠 Arteri Sekunder | -10.157099 | 123.610376 |
| 5 | RSUD S. K. Lerik | 🟠 Arteri Sekunder | -10.149674 | 123.608812 |
| 6 | RS St. Carolus Borromeus | 🟠 Arteri Sekunder | -10.214981 | 123.620588 |
| 7 | RSU Leona | 🟠 Arteri Sekunder | -10.170494 | 123.627402 |
| 8 | RSU Mamami | 🔵 Jalan Lokal | -10.153394 | 123.609183 |
| 9 | RS Kartini Kupang | 🔵 Jalan Lokal | -10.156561 | 123.628247 |
| 10 | RSIA Dedari | 🔵 Jalan Lokal | -10.165508 | 123.627679 |
| 11 | RS Jiwa Naimata | 🔵 Jalan Lokal | -10.178839 | 123.639063 |

**Klasifikasi Jalan Arteri:**
- 🔴 **Primer**: Jalan utama kota dengan akses cepat (Jl. El Tari, Timor Raya)
- 🟠 **Sekunder**: Jalan penghubung kawasan
- 🔵 **Lokal**: Jalan lingkungan/perumahan

---

## 🔧 Troubleshooting

### Server Error

```bash
# ModuleNotFoundError
pip install -r backend/requirements.txt

# dataset JSON not found
cd backend/scripts
python generate_matriks_ors.py

# ORS API error 403 (quota habis)
# Daftar API key baru di openrouteservice.org
# Update di backend/app.py dan scripts/generate_matriks_ors.py
```

### Frontend Error

```javascript
// Peta tidak muncul
// 1. Cek koneksi internet (Leaflet tiles butuh internet)
// 2. Buka console browser (F12) untuk error
// 3. Pastink file app.js, floydWarshall.js, graphVisualization.js loaded

// Rute tidak muncul
// 1. Cek backend server running (http://127.0.0.1:5000/api/dataset)
// 2. Cek console untuk error ORS API
// 3. Test endpoint /api/route dengan Postman

// Graf tidak muncul
// 1. Cek graphVisualization.js loaded
// 2. Cek dataset_with_matrix.json valid (12 hospitals)
// 3. Refresh halaman (Ctrl+R)
```

### Custom Location Error

- **Koordinat tidak valid**: Format harus angka (-10.xxx, 123.xxx)
- **Di luar area**: Kupang lat: -11 to -9, lng: 123 to 124
- **ORS API error**: Cek koneksi internet dan quota API

---

## 📚 Referensi

1. **Floyd, R. W.** (1962). "Algorithm 97: Shortest Path". *Communications of the ACM*.
2. **Warshall, S.** (1962). "A Theorem on Boolean Matrices". *Journal of the ACM*.
3. **Cormen, T. H., et al.** (2009). *Introduction to Algorithms* (3rd ed.). MIT Press.
4. **OpenRouteService Docs**: https://openrouteservice.org/dev/
5. **Leaflet.js Docs**: https://leafletjs.com/reference.html

---

## 📄 License

MIT License - Free to use for educational purposes

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ for Analisis Algoritma Course

*Optimizing Healthcare Routes, One Algorithm at a Time*

</div>
