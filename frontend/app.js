let map;
let hospitals = [];
let distanceMatrix;
let durationMatrix;
let originalDistanceMatrix;
let originalDurationMatrix;
let floydWarshallResult = null;
let allLocations = [];
let polylineLayer = null;
let hospitalMarkers = [];
let customLocationMarker = null;
let customLocation = null;
let isRouteCalculated = false; // Flag untuk tracking apakah rute sudah dihitung

// Preset lokasi umum di Kupang - DEPRECATED (diganti dengan geocoding)
// Kept for backward compatibility with map click feature

const hospitalIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDMwIDQwIj48cGF0aCBmaWxsPSIjMjE5NmYzIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE1IDAgQyA4IDAgMyA1IDMgMTIgQyAzIDE4IDguNSAyNSAxNSA0MCBDIDIxLjUgMjUgMjcgMTggMjcgMTIgQyAyNyA1IDIyIDAgMTUgMCBaIE0gMTUgMTcgQyAxMiAxNyAxMCAxNSAxMCAxMiBDIDEwIDkgMTIgNyAxNSA3IEMgMTggNyAyMCA5IDIwIDEyIEMgMjAgMTUgMTggMTcgMTUgMTcgWiIvPjwvc3ZnPg==',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
});

// Icon colors based on road class
function getHospitalIcon(roadClass) {
    const colors = {
        'arteri_primer': '#e74c3c',      // Red
        'arteri_sekunder': '#f39c12',    // Orange  
        'jalan_lokal': '#3498db'         // Blue
    };
    const color = colors[roadClass] || '#2196f3';
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path fill="${color}" stroke="#fff" stroke-width="2" d="M15 0 C 8 0 3 5 3 12 C 3 18 8.5 25 15 40 C 21.5 25 27 18 27 12 C 27 5 22 0 15 0 Z M 15 17 C 12 17 10 15 10 12 C 10 9 12 7 15 7 C 18 7 20 9 20 12 C 20 15 18 17 15 17 Z"/></svg>`;
    
    return L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -40]
    });
}

function showLoading(show = true) {
    const loadingEl = document.getElementById("loading");
    if (show) {
        loadingEl.classList.remove("hidden");
    } else {
        loadingEl.classList.add("hidden");
    }
}

function showNotification(message, type = "info") {
    const notifEl = document.getElementById("notification");
    notifEl.textContent = message;
    notifEl.className = `notification ${type}`;
    notifEl.classList.remove("hidden");

    setTimeout(() => {
        notifEl.classList.add("hidden");
    }, 4000);
}

function initMap() {
    map = L.map("map").setView([-10.16, 123.61], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);
    
    // Event listener untuk klik peta (set custom location)
    map.on('click', function(e) {
        const mode = document.getElementById('locationMode').value;
        if (mode === 'custom') {
            setCustomLocationFromClick(e.latlng.lat, e.latlng.lng);
        }
    });
}

async function loadDataset() {
    try {
        showLoading(true);
        const res = await fetch("/api/dataset");

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.hospitals || !data.matrices) {
            throw new Error("Data tidak lengkap");
        }

        hospitals = Object.values(data.hospitals);
        distanceMatrix = data.matrices.distances_m;
        durationMatrix = data.matrices.durations_s;

        // Save original matrices
        originalDistanceMatrix = distanceMatrix.map(row => [...row]);
        originalDurationMatrix = durationMatrix.map(row => [...row]);

        // Build all locations array (semua RS)
        allLocations = hospitals;

        // Populate FROM dropdown
        let fromSelect = document.getElementById("fromLocation");
        fromSelect.innerHTML = '';
        allLocations.forEach(loc => {
            let opt = document.createElement("option");
            opt.value = loc.id;
            opt.textContent = `${loc.name} (${loc.type})`;
            fromSelect.appendChild(opt);
        });
        fromSelect.value = "0"; // Default: RS pertama

        // Populate TO dropdown
        let select = document.getElementById("targetRS");
        select.innerHTML = '<option value="">-- Pilih RS Tujuan --</option>';

        allLocations.forEach(loc => {
            let opt = document.createElement("option");
            opt.value = loc.id;
            opt.textContent = `${loc.name} (${loc.type})`;
            select.appendChild(opt);
        });

        hospitals.forEach(h => {
            const marker = L.marker([h.lat, h.lng], {
                icon: getHospitalIcon(h.road_class),
                title: h.name
            })
                .addTo(map)
                .bindPopup(`<b>${h.name}</b><br><i>${h.type}</i><br>Jalan: ${h.road_class.replace(/_/g, ' ')}`);
            hospitalMarkers.push(marker);
        });

        showLoading(false);
        showNotification("Data berhasil dimuat!", "success");
        console.log("Dataset loaded:", data);

    } catch (error) {
        showLoading(false);
        showNotification(`Error: ${error.message}`, "error");
        console.error("Error loading dataset:", error);
    }
}

function hitungRuteTercepat() {
    try {
        const mode = document.getElementById("locationMode").value;
        const targetSelect = document.getElementById("targetRS");
        const target = parseInt(targetSelect.value);

        if (isNaN(target) || target < 0) {
            showNotification("Silakan pilih RS tujuan!", "error");
            return;
        }

        // Mode lokasi custom
        if (mode === 'custom') {
            if (!customLocation) {
                showNotification("Silakan pilih lokasi awal terlebih dahulu (klik peta atau pilih preset)!", "error");
                return;
            }
            
            calculateRouteFromCustom(target);
            return;
        }

        // Mode antar RS (original logic)
        const fromSelect = document.getElementById("fromLocation");
        const from = parseInt(fromSelect.value);

        if (isNaN(from)) {
            showNotification("Silakan pilih RS asal!", "error");
            return;
        }

        if (from === target) {
            showNotification("RS asal dan tujuan tidak boleh sama!", "error");
            return;
        }

        showLoading(true);

        const n = distanceMatrix.length;

        const distCopy = distanceMatrix.map(row =>
            row.map(val => val === 0 ? 0 : (val > 0 ? val : Infinity))
        );

        const durCopy = durationMatrix.map(row =>
            row.map(val => val === 0 ? 0 : (val > 0 ? val : Infinity))
        );

        const distResult = floydWarshall(distCopy);
        const durResult = floydWarshall(durCopy);

        // Save results for matrix visualization
        floydWarshallResult = {
            distance: distResult,
            duration: durResult
        };

        let path = reconstructPath(distResult.next, from, target);

        if (path.length < 2) {
            showLoading(false);
            showNotification("Tidak ada rute ditemukan!", "error");
            return;
        }

        fetchRealRoute(path, distResult.dist, durResult.dist);

    } catch (error) {
        showLoading(false);
        showNotification(`Error: ${error.message}`, "error");
        console.error("Error calculating route:", error);
    }
}

async function fetchRealRoute(path, distMatrix, durMatrix) {
    try {
        const coordinates = path.map(idx => {
            let h = hospitals.find(x => x.id === idx);
            return [h.lng, h.lat];
        });

        const response = await fetch("/api/route", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ coordinates })
        });

        if (!response.ok) {
            throw new Error("Gagal mendapatkan rute dari server");
        }

        const data = await response.json();

        if (data.type === "success" && data.geometry) {
            const coords = data.geometry.coordinates.map(coord => [coord[1], coord[0]]);

            if (polylineLayer) polylineLayer.remove();

            polylineLayer = L.polyline(coords, {
                color: "#2196f3",
                weight: 5,
                opacity: 0.7
            }).addTo(map);

            map.fitBounds(polylineLayer.getBounds());

            displayRouteInfo(path, distMatrix, durMatrix);
            
            // Set flag bahwa rute sudah dihitung
            isRouteCalculated = true;
            
            // Highlight path in graph visualization
            if (window.graphVisualizer) {
                highlightPathInGraph(path);
            }

            showLoading(false);
            showNotification("Rute tercepat berhasil dihitung!", "success");
        } else {
            throw new Error("Format rute tidak valid");
        }

    } catch (error) {
        showLoading(false);
        showNotification(`Error: ${error.message}`, "error");
        console.error("Error fetching real route:", error);
    }
}

function displayRouteInfo(path, distMatrix, durMatrix) {
    const routeInfoEl = document.getElementById("routeInfo");
    const routeDetailsEl = document.getElementById("routeDetails");

    let html = "";
    let totalDist = 0;
    let totalDur = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const fromIdx = path[i];
        const toIdx = path[i + 1];

        const segmentDist = distMatrix[fromIdx][toIdx];
        const segmentDur = durMatrix[fromIdx][toIdx];

        totalDist += segmentDist;
        totalDur += segmentDur;

        const fromLoc = allLocations.find(loc => loc.id === fromIdx);
        const toLoc = allLocations.find(loc => loc.id === toIdx);

        html += `
            <div class="route-step">
                <strong>Langkah ${i + 1}</strong><br>
                Dari: <b>${fromLoc.name}</b><br>
                Ke: <b>${toLoc.name}</b><br>
                Jarak: ${(segmentDist / 1000).toFixed(2)} km<br>
                Waktu: ${Math.round(segmentDur / 60)} menit
            </div>
        `;
    }

    html += `
        <div class="route-total">
            <div>📍 Total Jarak: <span style="color: #1976d2">${(totalDist / 1000).toFixed(2)} km</span></div>
            <div>⏱️ Estimasi Waktu: <span style="color: #1976d2">${Math.round(totalDur / 60)} menit</span></div>
            <div>🏥 Jumlah Perhentian: <span style="color: #1976d2">${path.length - 2}</span></div>
        </div>
    `;

    routeDetailsEl.innerHTML = html;
    routeInfoEl.classList.remove("hidden");
}

function resetRoute() {
    if (polylineLayer) {
        polylineLayer.remove();
        polylineLayer = null;
    }
    
    if (customLocationMarker) {
        customLocationMarker.remove();
        customLocationMarker = null;
    }
    
    customLocation = null;
    isRouteCalculated = false; // Reset flag

    document.getElementById("routeInfo").classList.add("hidden");
    document.getElementById("locationMode").value = "hospital";
    document.getElementById("fromLocation").value = "0";
    document.getElementById("targetRS").value = "";
    document.getElementById("customAddress").value = "";
    document.getElementById("customLocationInfo").classList.add("hidden");
    document.getElementById("addressHelpText").classList.add("hidden");
    document.getElementById("hospitalModeControls").classList.remove("hidden");
    document.getElementById("customModeControls").classList.add("hidden");
    
    // Clear graph highlight
    if (window.graphVisualizer) {
        window.graphVisualizer.clearHighlight();
    }

    if (hospitalMarkers.length > 0) {
        const group = L.featureGroup(hospitalMarkers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
    
    showNotification("Rute telah direset.", "info");

    showNotification("Rute telah direset", "info");
}

function getLocationName(id) {
    const loc = allLocations.find(l => l.id === id);
    return loc ? loc.name : `Lokasi ${id}`;
}

function showMatrixModal() {
    if (!floydWarshallResult && !isRouteCalculated) {
        showNotification("Hitung rute terlebih dahulu untuk melihat matriks!", "error");
        return;
    }

    const modal = document.getElementById("matrixModal");
    modal.classList.remove("hidden");

    // Default: show distance matrix
    renderMatrix("distance");
}

function showAllPairsModal() {
    if (!floydWarshallResult && !isRouteCalculated) {
        showNotification("Hitung rute terlebih dahulu untuk melihat semua jalur!", "error");
        return;
    }

    const modal = document.getElementById("allPairsModal");
    modal.classList.remove("hidden");

    // Default: show distance table
    renderAllPairsTable("distance");
}

function renderMatrix(type) {
    const container = document.getElementById("matrixContainer");
    const result = floydWarshallResult[type];
    const originalMatrix = type === "distance" ? originalDistanceMatrix : originalDurationMatrix;
    const unit = type === "distance" ? "km" : "min";
    const divisor = type === "distance" ? 1000 : 60;

    let html = '<div class="matrix-wrapper"><h4>Matriks Hasil Floyd-Warshall</h4>';
    html += '<table class="matrix-table"><thead><tr><th>Dari \\ Ke</th>';

    // Header columns
    allLocations.forEach(loc => {
        html += `<th title="${loc.name}">${loc.id}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Rows
    allLocations.forEach((fromLoc, i) => {
        html += `<tr><th title="${fromLoc.name}">${fromLoc.id}</th>`;
        allLocations.forEach((toLoc, j) => {
            const value = result.dist[i][j];
            const originalValue = originalMatrix[i][j];
            const isChanged = result.changes[i][j];
            const displayValue = value === Infinity ? '∞' : (value / divisor).toFixed(2);

            let cellClass = '';
            if (i === j) {
                cellClass = 'diagonal';
            } else if (isChanged) {
                cellClass = 'indirect';
            } else if (value < Infinity) {
                cellClass = 'direct';
            }

            let title = `${fromLoc.name} → ${toLoc.name}: ${displayValue} ${unit}`;
            if (isChanged) {
                const origDisplay = (originalValue / divisor).toFixed(2);
                title += `\nAsli: ${origDisplay} ${unit}\nDioptimalkan via jalur tidak langsung`;
            }

            html += `<td class="${cellClass}" title="${title}">${displayValue}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Location legend
    html += '<div class="location-legend"><h4>Keterangan Lokasi:</h4>';
    allLocations.forEach(loc => {
        html += `<div><strong>${loc.id}:</strong> ${loc.name}</div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

function renderAllPairsTable(type) {
    const container = document.getElementById("allPairsContainer");
    const result = floydWarshallResult[type];
    const unit = type === "distance" ? "km" : "menit";
    const divisor = type === "distance" ? 1000 : 60;

    let html = '<table class="all-pairs-table">';
    html += '<thead><tr>';
    html += '<th>Dari</th><th>Ke</th><th>Jarak/Waktu</th><th>Jalur</th><th>Tipe</th>';
    html += '</tr></thead><tbody>';

    // Generate all pairs
    allLocations.forEach((fromLoc, i) => {
        allLocations.forEach((toLoc, j) => {
            if (i !== j) {
                const value = result.dist[i][j];
                if (value < Infinity) {
                    const displayValue = (value / divisor).toFixed(2);
                    const path = reconstructPath(result.next, i, j);
                    const pathNames = path.map(id => {
                        const loc = allLocations.find(l => l.id === id);
                        return `${loc.name} (${id})`;
                    }).join(' → ');

                    const isChanged = result.changes[i][j];
                    const routeType = isChanged ?
                        '<span class="badge indirect-badge">Tidak Langsung</span>' :
                        '<span class="badge direct-badge">Langsung</span>';

                    html += `<tr>`;
                    html += `<td>${fromLoc.name}</td>`;
                    html += `<td>${toLoc.name}</td>`;
                    html += `<td><strong>${displayValue}</strong> ${unit}</td>`;
                    html += `<td class="path-cell">${pathNames}</td>`;
                    html += `<td>${routeType}</td>`;
                    html += `</tr>`;
                }
            }
        });
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function closeMatrixModal() {
    document.getElementById("matrixModal").classList.add("hidden");
}

function closeAllPairsModal() {
    document.getElementById("allPairsModal").classList.add("hidden");
}

function showGraphModal() {
    if (!floydWarshallResult && !isRouteCalculated) {
        showNotification("Hitung rute terlebih dahulu untuk melihat graf!", "error");
        return;
    }
    
    showGraphVisualization(hospitals, floydWarshallResult.distance.dist, 'weighted');
}

// Geocoding function menggunakan Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
    try {
        showLoading(true);
        
        // Tambahkan "Kota Kupang, NTT, Indonesia" jika belum ada
        let fullAddress = address;
        if (!address.toLowerCase().includes('kupang')) {
            fullAddress = `${address}, Kota Kupang, NTT, Indonesia`;
        }
        
        console.log("Mencari alamat:", fullAddress);
        
        // Nominatim Geocoding API (OpenStreetMap)
        // Bounded search untuk area Kupang: lat -10.0 to -10.3, lon 123.5 to 123.7
        const url = `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(fullAddress)}` +
                    `&format=json` +
                    `&limit=5` +
                    `&addressdetails=1` +
                    `&countrycodes=id`;
        
        console.log("URL Geocoding:", url);
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GIS-RS-Kupang-Routing-App/1.0 (Educational Project)'
            }
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Geocoding gagal (${response.status}). Silakan coba lagi.`);
        }
        
        const data = await response.json();
        console.log("Data geocoding:", data);
        
        if (!data || data.length === 0) {
            throw new Error('Alamat tidak ditemukan. Coba gunakan nama landmark (contoh: "Flobamora Mall") atau nama jalan utama.');
        }
        
        // Ambil hasil pertama
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const foundName = result.display_name || address;
        
        console.log("Koordinat ditemukan:", lat, lng);
        
        // Validasi koordinat dalam area Kupang (lebih fleksibel)
        if (lat < -10.5 || lat > -9.8 || lng < 123.3 || lng > 124.0) {
            console.warn("Koordinat di luar area Kupang:", lat, lng);
            throw new Error('Lokasi ditemukan di luar area Kota Kupang. Pastikan alamat benar.');
        }
        
        showLoading(false);
        return { lat, lng, name: foundName, originalAddress: address };
        
    } catch (error) {
        showLoading(false);
        console.error("Geocoding error:", error);
        throw error;
    }
}

function setCustomLocationFromClick(lat, lng) {
    customLocation = { lat, lng, name: `Lokasi Custom (${lat.toFixed(5)}, ${lng.toFixed(5)})` };
    
    // Hapus marker lama jika ada
    if (customLocationMarker) {
        customLocationMarker.remove();
    }
    
    // Tambah marker baru
    const customIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDMwIDQwIj48cGF0aCBmaWxsPSIjZmY1NzIyIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE1IDAgQyA4IDAgMyA1IDMgMTIgQyAzIDE4IDguNSAyNSAxNSA0MCBDIDIxLjUgMjUgMjcgMTggMjcgMTIgQyAyNyA1IDIyIDAgMTUgMCBaIE0gMTUgMTcgQyAxMiAxNyAxMCAxNSAxMCAxMiBDIDEwIDkgMTIgNyAxNSA3IEMgMTggNyAyMCA5IDIwIDEyIEMgMjAgMTUgMTggMTcgMTUgMTcgWiIvPjwvc3ZnPg==',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -40]
    });
    
    customLocationMarker = L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`<b>Lokasi Awal Anda</b><br>${customLocation.name}`)
        .openPopup();
    
    // Update info
    document.getElementById('customLocationInfo').classList.remove('hidden');
    document.getElementById('customLocationName').textContent = customLocation.name;
    
    showNotification("Lokasi custom berhasil ditandai! Pilih RS tujuan dan klik Hitung Rute.", "success");
}

function setPresetLocation(presetKey) {
    const preset = presetLocations[presetKey];
    if (preset) {
        setCustomLocationFromClick(preset.lat, preset.lng);
        customLocation.name = preset.name;
        document.getElementById('customLocationName').textContent = preset.name;
    }
}

async function calculateRouteFromCustom(targetRSId) {
    try {
        showLoading(true);
        
        // Ambil koordinat target RS
        const targetRS = hospitals.find(h => h.id === targetRSId);
        if (!targetRS) {
            throw new Error("RS tujuan tidak ditemukan");
        }
        
        // Request ke ORS untuk rute langsung dari custom location ke target RS
        const coordinates = [
            [customLocation.lng, customLocation.lat],
            [targetRS.lng, targetRS.lat]
        ];
        
        const response = await fetch("/api/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinates })
        });
        
        if (!response.ok) {
            throw new Error("Gagal mendapatkan rute dari server");
        }
        
        const data = await response.json();
        
        if (data.type === "success" && data.geometry) {
            const coords = data.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            if (polylineLayer) polylineLayer.remove();
            
            polylineLayer = L.polyline(coords, {
                color: "#2196f3",
                weight: 5,
                opacity: 0.7
            }).addTo(map);
            
            map.fitBounds(polylineLayer.getBounds());
            
            // Hitung jarak dan waktu dari geometry
            let totalDistance = 0;
            for (let i = 0; i < data.geometry.coordinates.length - 1; i++) {
                const [lng1, lat1] = data.geometry.coordinates[i];
                const [lng2, lat2] = data.geometry.coordinates[i + 1];
                totalDistance += getDistanceFromLatLng(lat1, lng1, lat2, lng2);
            }
            
            // Estimasi waktu (asumsi 40 km/jam)
            const estimatedTime = (totalDistance / 1000) / 40 * 60; // menit
            
            displayCustomRouteInfo(customLocation, targetRS, totalDistance, estimatedTime);
            
            // Set flag bahwa rute sudah dihitung
            isRouteCalculated = true;
            
            showLoading(false);
            showNotification("Rute dari lokasi Anda berhasil dihitung!", "success");
        } else {
            throw new Error("Format rute tidak valid");
        }
        
    } catch (error) {
        showLoading(false);
        showNotification(`Error: ${error.message}`, "error");
        console.error("Error calculating custom route:", error);
    }
}

function getDistanceFromLatLng(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function displayCustomRouteInfo(from, to, distance, duration) {
    const routeInfoEl = document.getElementById("routeInfo");
    const routeDetailsEl = document.getElementById("routeDetails");
    
    let html = `
        <div class="route-step">
            <strong>Rute Langsung</strong><br>
            Dari: <b>${from.name}</b><br>
            Ke: <b>${to.name}</b><br>
            Jarak: ${(distance / 1000).toFixed(2)} km<br>
            Estimasi Waktu: ${Math.round(duration)} menit
        </div>
        <div class="route-total">
            <div>📍 Total Jarak: <span style="color: #1976d2">${(distance / 1000).toFixed(2)} km</span></div>
            <div>⏱️ Estimasi Waktu: <span style="color: #1976d2">${Math.round(duration)} menit</span></div>
            <div>🏥 RS Tujuan: <span style="color: #1976d2">${to.name}</span></div>
        </div>
    `;
    
    routeDetailsEl.innerHTML = html;
    routeInfoEl.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
    initMap();
    await loadDataset();

    document.getElementById("btnHitung").onclick = hitungRuteTercepat;
    document.getElementById("btnReset").onclick = resetRoute;
    document.getElementById("btnShowMatrix").onclick = showMatrixModal;
    document.getElementById("btnShowAllPairs").onclick = showAllPairsModal;
    document.getElementById("btnShowGraph").onclick = showGraphModal;
    document.getElementById("closeMatrix").onclick = closeMatrixModal;
    document.getElementById("closeAllPairs").onclick = closeAllPairsModal;
    document.getElementById("closeGraph").onclick = closeGraphModal;
    
    // Location mode switching
    document.getElementById("locationMode").addEventListener("change", function(e) {
        const mode = e.target.value;
        const hospitalControls = document.getElementById("hospitalModeControls");
        const customControls = document.getElementById("customModeControls");
        const helpText = document.getElementById("addressHelpText");
        
        if (mode === 'hospital') {
            hospitalControls.classList.remove("hidden");
            customControls.classList.add("hidden");
            helpText.classList.add("hidden");
            if (customLocationMarker) {
                customLocationMarker.remove();
                customLocationMarker = null;
            }
            customLocation = null;
            document.getElementById('customLocationInfo').classList.add('hidden');
        } else {
            hospitalControls.classList.add("hidden");
            customControls.classList.remove("hidden");
            helpText.classList.remove("hidden");
        }
    });
    
    // Geocode address button
    document.getElementById("btnGeocodeAddress").addEventListener("click", async function() {
        const addressInput = document.getElementById("customAddress");
        const address = addressInput.value.trim();
        
        if (!address) {
            showNotification("Silakan masukkan alamat terlebih dahulu!", "error");
            return;
        }
        
        try {
            const location = await geocodeAddress(address);
            setCustomLocationFromClick(location.lat, location.lng);
            customLocation.name = location.name;
            customLocation.originalAddress = location.originalAddress;
            document.getElementById('customLocationName').textContent = location.name;
            
            showNotification("Alamat ditemukan! Pilih RS tujuan dan klik Hitung Rute.", "success");
        } catch (error) {
            showNotification(error.message, "error");
        }
    });
    
    // Enter key pada address input
    document.getElementById("customAddress").addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {
            document.getElementById("btnGeocodeAddress").click();
        }
    });

    // Tab switching for matrix modal
    document.querySelectorAll("#matrixModal .tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("#matrixModal .tab-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            renderMatrix(e.target.dataset.tab);
        });
    });

    // Tab switching for all-pairs modal
    document.querySelectorAll("#allPairsModal .tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("#allPairsModal .tab-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            renderAllPairsTable(e.target.dataset.tab);
        });
    });

    // Close modal when clicking outside
    window.onclick = function (event) {
        const matrixModal = document.getElementById("matrixModal");
        const allPairsModal = document.getElementById("allPairsModal");
        if (event.target === matrixModal) {
            closeMatrixModal();
        }
        if (event.target === allPairsModal) {
            closeAllPairsModal();
        }
    };
});
