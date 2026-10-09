const totalFrames = 900;
const slider = document.getElementById('frame-slider');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const playText = document.getElementById('play-text');
const resetBtn = document.getElementById('reset-btn');
const frameVal = document.getElementById('frame-val');
const percentVal = document.getElementById('percent-val');
const distVal = document.getElementById('dist-val');
const potholeCountEl = document.getElementById('pothole-count');

// Route State (Math Variables)
let airportRoute = [];
let cumulativeDistances = [0];
let totalHighwayDistance = 0;
let plannedPolyline, traveledPolyline, carMarker;
let startMarker, endMarker; // تعريف الـ draggable markers
let timer = null;

// حولنا الإحداثيات لـ let عشان نقدر نعدلها
let pointA = [31.9440, 35.8570];
let pointB = [31.7224, 35.9860];

// Map Initialization
const map = L.map('map', {
    zoomControl: false
}).setView([31.8300, 35.8800], 12);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// دالة سحب المسار (قابلة لإعادة الاستخدام لما نغير النقاط)
async function fetchAndRenderRoute() {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pointA[1]},${pointA[0]};${pointB[1]},${pointB[0]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        airportRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        
        recalculateMathAndRender();
        
        const loadingScreen = document.getElementById('loading-screen');
        if(loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }

        slider.disabled = false;
        playBtn.disabled = false;
        resetBtn.disabled = false;

    } catch (error) {
        console.error("Route Fetch Error:", error);
    }
}

// قلب الـ Logic الرياضي وحساب المسافات
function recalculateMathAndRender() {
    // 1. تصفير العدادات والمسافات القديمة
    totalHighwayDistance = 0;
    cumulativeDistances = [0];

    // 2. إعادة الحساب الدقيق بناءً على المسار الجديد
    for (let i = 0; i < airportRoute.length - 1; i++) {
        const segDist = map.distance(airportRoute[i], airportRoute[i + 1]);
        totalHighwayDistance += segDist;
        cumulativeDistances.push(totalHighwayDistance);
    }

    // 3. تحديث خطوط الرسم (Polylines)
    if (!plannedPolyline) {
        plannedPolyline = L.polyline(airportRoute, { color: '#64748b', weight: 6, dashArray: '8, 10', opacity: 0.7 }).addTo(map);
        traveledPolyline = L.polyline([airportRoute[0]], { color: '#2563eb', weight: 7, opacity: 0.95, lineCap: 'round' }).addTo(map);
    } else {
        plannedPolyline.setLatLngs(airportRoute);
        traveledPolyline.setLatLngs([airportRoute[0]]);
    }

    // 4. تهيئة الـ Draggable Markers لأول مرة
    if (!startMarker) {
        startMarker = L.marker(pointA, { draggable: true, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>نقطة البداية (اسحبني)</b>");
        endMarker = L.marker(pointB, { draggable: true, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>نقطة النهاية (اسحبني)</b>");

        // Event Listeners للـ Dragging
        startMarker.on('dragend', function (e) {
            pointA = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            handleRouteUpdate();
        });

        endMarker.on('dragend', function (e) {
            pointB = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            handleRouteUpdate();
        });
    }

    // 5. تهيئة أو إعادة تعيين سيارة المحاكاة
    if (!carMarker) {
        const carIcon = L.divIcon({
            html: `<div class="car-marker-container"><div class="car-pulse"></div><div class="car-icon-body">🚘</div></div>`,
            className: 'car-icon-wrapper', iconSize: [38, 38], iconAnchor: [19, 19]
        });
        carMarker = L.marker(airportRoute[0], { icon: carIcon, zIndexOffset: 2000 }).addTo(map);
    } else {
        carMarker.setLatLng(airportRoute[0]);
    }

    resetSimulationUI();
}

// هاندلر لما تتغير النقاط
function handleRouteUpdate() {
    if (timer) togglePlay(); // وقف المحاكاة إذا شغالة
    slider.value = 0; // رجع الـ slider للصفر
    fetchAndRenderRoute(); // اسحب المسار الجديد واحسب الـ Math
}

function resetSimulationUI() {
    slider.value = 0;
    frameVal.innerText = `0 / ${totalFrames}`;
    percentVal.innerText = `0%`;
    distVal.innerText = `0 م / ${Math.round(totalHighwayDistance).toLocaleString()} م`;
    map.fitBounds(plannedPolyline.getBounds(), { padding: [40, 40] });
}

// Interpolation Logic
function getPositionAtProgress(progress) {
    if (!airportRoute.length) return { position: pointA, path: [] };
    const targetDist = progress * totalHighwayDistance;

    for (let i = 0; i < cumulativeDistances.length - 1; i++) {
        if (targetDist >= cumulativeDistances[i] && targetDist <= cumulativeDistances[i + 1]) {
            const segmentStart = cumulativeDistances[i];
            const segmentEnd = cumulativeDistances[i + 1];
            const segmentRatio = (targetDist - segmentStart) / (segmentEnd - segmentStart || 1);

            const p1 = airportRoute[i];
            const p2 = airportRoute[i + 1];
            const lat = p1[0] + segmentRatio * (p2[0] - p1[0]);
            const lng = p1[1] + segmentRatio * (p2[1] - p1[1]);

            const pathSoFar = airportRoute.slice(0, i + 1);
            pathSoFar.push([lat, lng]);

            return { position: [lat, lng], path: pathSoFar };
        }
    }
    return { position: airportRoute[airportRoute.length - 1], path: airportRoute };
}

function updateSimulation(frame) {
    if (!airportRoute.length) return;
    const safeFrame = Math.max(0, Math.min(frame, totalFrames));
    const progress = safeFrame / totalFrames;
    const { position, path } = getPositionAtProgress(progress);

    carMarker.setLatLng(position);
    traveledPolyline.setLatLngs(path);

    if (timer) map.panTo(position, { animate: true, duration: 0.1 });

    const distanceCovered = progress * totalHighwayDistance;
    frameVal.innerText = `${safeFrame} / ${totalFrames}`;
    percentVal.innerText = `${Math.round(progress * 100)}%`;
    distVal.innerText = `${Math.round(distanceCovered).toLocaleString()} م / ${Math.round(totalHighwayDistance).toLocaleString()} م`;
}

// Events
slider.addEventListener('input', function() { updateSimulation(parseInt(this.value, 10)); });

function togglePlay() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        playIcon.innerText = "▶️";
        playText.innerText = "تشغيل المحاكاة";
        playBtn.style.background = "linear-gradient(135deg, #2563eb, #1d4ed8)";
    } else {
        playIcon.innerText = "⏸️";
        playText.innerText = "إيقاف مؤقت";
        playBtn.style.background = "linear-gradient(135deg, #d97706, #b45309)";

        timer = setInterval(() => {
            let cur = parseInt(slider.value, 10);
            if (cur >= totalFrames) cur = 0;
            else cur = Math.min(totalFrames, cur + 3);
            
            slider.value = cur;
            updateSimulation(cur);
            if (cur >= totalFrames) togglePlay();
        }, 40);
    }
}

playBtn.addEventListener('click', togglePlay);

resetBtn.addEventListener('click', () => {
    if (timer) togglePlay();
    slider.value = 0;
    updateSimulation(0);
    map.fitBounds(plannedPolyline.getBounds(), { padding: [40, 40] });
});

// APIs
async function loadBackendPotholes() {
    try {
        const response = await fetch('/api/potholes');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            potholeCountEl.innerText = `${result.data.length} عوائق`;
            renderPotholeMarkers(result.data);
        }
    } catch (err) {
        console.warn('API error, using dummy data.');
    }
}

function renderPotholeMarkers(items) {
    items.forEach(item => {
        const potholeIcon = L.divIcon({
            html: '<div class="pothole-icon-wrapper">⚠️</div>',
            className: 'custom-pothole-icon', iconSize: [28, 28], iconAnchor: [14, 14]
        });
        L.marker([item.lat, item.lng], { icon: potholeIcon }).addTo(map).bindPopup(`
            <div class="popup-card">
                <span class="popup-badge">${item.severity === 'Severe' ? 'خطورة عالية' : 'متوسط'}</span>
                <div class="popup-title">${item.incidentType || 'حفرة طريق'} - ${item.id}</div>
                <div class="popup-desc">📍 ${item.address}</div>
                <div class="popup-desc">الحالة: <b>${item.status}</b></div>
            </div>
        `);
    });
}

fetchAndRenderRoute();
loadBackendPotholes();