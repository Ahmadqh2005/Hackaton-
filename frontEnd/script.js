// --- 1. ثوابت وإعدادات المحاكاة والـ AI Math ---
const totalFrames = 1023; // تم التحديث حسب بيانات الفيديو الخاصة بك
const FPS = 30.0;
const videoDuration = 34.1;

// عناصر واجهة المستخدم للمحاكاة
const slider = document.getElementById('frame-slider');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const playText = document.getElementById('play-text');
const resetBtn = document.getElementById('reset-btn');
const frameVal = document.getElementById('frame-val');
const percentVal = document.getElementById('percent-val');
const distVal = document.getElementById('dist-val');
const potholeCountEl = document.getElementById('pothole-count');
const nextHoleDistEl = document.getElementById('next-hole-dist');
const nextHoleCard = document.getElementById('next-hole-card');

// تحديث الـ Slider ليتوافق مع الفريمات الحقيقية للفيديو
if (slider) slider.max = totalFrames;

// متغيرات المسار
let airportRoute = [];
let cumulativeDistances = [0];
let totalHighwayDistance = 0;
let plannedPolyline, traveledPolyline, carMarker;
let startMarker, endMarker;
let timer = null;

// إحداثيات البداية والنهاية (شارع المطار - عمان)
let pointA = [31.9440, 35.8570];
let pointB = [31.8815, 35.8812];

// --- 2. بيانات الـ AI الفعلية من الفيديو ---
const aiDetections = [
    { track_id: 4, frame_number: 237, timestamp_seconds: 7.867, confidence: 0.7627 },
    { track_id: 5, frame_number: 213, timestamp_seconds: 7.067, confidence: 0.4923 },
    { track_id: 7, frame_number: 219, timestamp_seconds: 7.267, confidence: 0.5636 },
    { track_id: 9, frame_number: 228, timestamp_seconds: 7.567, confidence: 0.6140 },
    { track_id: 17, frame_number: 325, timestamp_seconds: 10.800, confidence: 0.4416 },
    { track_id: 20, frame_number: 386, timestamp_seconds: 12.833, confidence: 0.4409 },
    { track_id: 21, frame_number: 399, timestamp_seconds: 13.267, confidence: 0.4925 },
    { track_id: 25, frame_number: 533, timestamp_seconds: 17.733, confidence: 0.7627 },
    { track_id: 27, frame_number: 560, timestamp_seconds: 18.633, confidence: 0.5097 },
    { track_id: 34, frame_number: 859, timestamp_seconds: 28.600, confidence: 0.4674 }
];

// ترتيب الحفر زمنياً (حسب الفريم) لضمان دقة عمل العداد
aiDetections.sort((a, b) => a.frame_number - b.frame_number);

// --- 3. تهيئة الخريطة الأساسية ---
const map = L.map('map', {
    zoomControl: false
}).setView([31.8300, 35.8800], 12);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// --- 4. جلب ورسم المسار من OSRM ---
async function fetchAndRenderRoute() {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pointA[1]},${pointA[0]};${pointB[1]},${pointB[0]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        airportRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        
        recalculateMathAndRender();
        spawnAIPotholesOnRoute(); // زرع الحفر المكتشفة على الشارع

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }

        if (slider) slider.disabled = false;
        if (playBtn) playBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = false;
    } catch (error) {
        console.error("Route Fetch Error:", error);
    }
}

function recalculateMathAndRender() {
    totalHighwayDistance = 0;
    cumulativeDistances = [0];

    for (let i = 0; i < airportRoute.length - 1; i++) {
        const segDist = map.distance(airportRoute[i], airportRoute[i + 1]);
        totalHighwayDistance += segDist;
        cumulativeDistances.push(totalHighwayDistance);
    }

    if (!plannedPolyline) {
        plannedPolyline = L.polyline(airportRoute, { color: '#64748b', weight: 6, dashArray: '8, 10', opacity: 0.7 }).addTo(map);
        traveledPolyline = L.polyline([airportRoute[0]], { color: '#2563eb', weight: 7, opacity: 0.95, lineCap: 'round' }).addTo(map);
    } else {
        plannedPolyline.setLatLngs(airportRoute);
        traveledPolyline.setLatLngs([airportRoute[0]]);
    }

    if (!startMarker) {
        startMarker = L.marker(pointA, { draggable: true, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>نقطة البداية (اسحبني)</b>");
        endMarker = L.marker(pointB, { draggable: true, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>نقطة النهاية (اسحبني)</b>");

        startMarker.on('dragend', function (e) {
            pointA = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            handleRouteUpdate();
        });

        endMarker.on('dragend', function (e) {
            pointB = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            handleRouteUpdate();
        });
    }

    if (!carMarker) {
        const carIcon = L.divIcon({
            html: `<div class="car-marker-container"><div class="car-pulse"></div><div class="car-icon-body">🚘</div></div>`,
            className: 'car-icon-wrapper',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });
        carMarker = L.marker(airportRoute[0], { icon: carIcon, zIndexOffset: 2000 }).addTo(map);
    } else {
        carMarker.setLatLng(airportRoute[0]);
    }

    resetSimulationUI();
}

function handleRouteUpdate() {
    if (timer) togglePlay();
    if (slider) slider.value = 0;
    fetchAndRenderRoute();
}

function resetSimulationUI() {
    if (slider) slider.value = 0;
    if (frameVal) frameVal.innerText = `0 / ${totalFrames}`;
    if (percentVal) percentVal.innerText = `0%`;
    if (distVal) distVal.innerText = `0 م / ${Math.round(totalHighwayDistance).toLocaleString()} م`;
    map.fitBounds(plannedPolyline.getBounds(), { padding: [40, 40] });
    updateSimulation(0); // التهيئة لعرض المسافة لأول حفرة
}

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

// --- 5. إسقاط بيانات الـ AI الدقيقة على المسار ---
let activePotholesCount = 0;

function spawnAIPotholesOnRoute() {
    // إزالة الحفر القديمة إذا تم إعادة رسم المسار
    map.eachLayer((layer) => {
        if (layer.options && layer.options.isAIPothole) {
            map.removeLayer(layer);
        }
    });
    activePotholesCount = 0;

    aiDetections.forEach(item => {
        const progress = item.frame_number / totalFrames; // حساب مكان الحفرة على المسار
        const { position } = getPositionAtProgress(progress);
        
        let colorClass = 'green';
        let severityText = 'منخفض';
        if (item.confidence >= 0.7) { colorClass = 'red'; severityText = 'عالي الخطر'; }
        else if (item.confidence >= 0.5) { colorClass = 'orange'; severityText = 'متوسط'; }

        const alertIcon = L.divIcon({
            html: `<div class="alert-marker ${colorClass}">⚠️</div>`,
            className: 'custom-alert-icon',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const popupHTML = `
            <div class="popup-card">
                <span class="popup-badge" style="background: ${item.confidence >= 0.7 ? '#fee2e2' : '#fffbeb'}">مستوى الخطر: ${severityText}</span>
                <div class="popup-title">تتبع AI رقم #${item.track_id}</div>
                <div class="popup-desc">دقة الموديل: ${(item.confidence * 100).toFixed(1)}%</div>
                <div class="popup-desc">تم الرصد عند الثانية ${item.timestamp_seconds}s</div>
            </div>
        `;

        const marker = L.marker(position, { 
            icon: alertIcon,
            isAIPothole: true 
        }).addTo(map).bindPopup(popupHTML);

        activePotholesCount++;
    });

    if (potholeCountEl) potholeCountEl.innerText = `${activePotholesCount} عوائق`;
}

// --- 6. المحاكاة والـ Slider ---
function updateSimulation(frame) {
    if (!airportRoute.length) return;
    const safeFrame = Math.max(0, Math.min(frame, totalFrames));
    const progress = safeFrame / totalFrames;
    const { position, path } = getPositionAtProgress(progress);

    carMarker.setLatLng(position);
    traveledPolyline.setLatLngs(path);

    if (timer) map.panTo(position, { animate: true, duration: 0.1 });

    const distanceCovered = progress * totalHighwayDistance;
    const frameInput = document.getElementById('frame-input');
    if (frameInput) frameInput.value = safeFrame;
    if (percentVal) percentVal.innerText = `${Math.round(progress * 100)}%`;
    if (distVal) distVal.innerText = `${Math.round(distanceCovered).toLocaleString()} م / ${Math.round(totalHighwayDistance).toLocaleString()} م`;

    // حساب المسافة لأقرب حفرة والتحكم بظهور الكارد
    if (nextHoleDistEl && nextHoleCard) {
        const nextHole = aiDetections.find(hole => hole.frame_number >= safeFrame);
        
        if (nextHole) {
            const holeProgress = nextHole.frame_number / totalFrames;
            const holeTotalDist = holeProgress * totalHighwayDistance;
            
            let distRemaining = holeTotalDist - distanceCovered;
            distRemaining = Math.max(0, distRemaining);

            // يظهر فقط لما تكون المسافة 200 متر أو أقل
            if (distRemaining <= 200) {
                nextHoleCard.style.display = "flex";
                nextHoleDistEl.innerText = `${Math.round(distRemaining).toLocaleString()} متر (تتبع #${nextHole.track_id})`;
                nextHoleDistEl.style.color = "#e11d48";
                nextHoleCard.style.backgroundColor = "#fff1f2";
                nextHoleCard.style.borderColor = "#fecdd3";
            } else {
                nextHoleCard.style.display = "none";
            }
        } else {
            nextHoleCard.style.display = "none";
        }
    }

    // التنبيه الصوتي عند الاقتراب من الحفرة
    aiDetections.forEach(hole => {
        const frameDiff = hole.frame_number - safeFrame;
        if (frameDiff > 0 && frameDiff <= 15) {
            triggerAudioAlert();
        }
    });
}

function togglePlay() {
    if (!playBtn) return;
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
            // يتم التحرك فريم واحد بسلاسة
            else cur = Math.min(totalFrames, cur + 1); 

            slider.value = cur;
            updateSimulation(cur);
            if (cur >= totalFrames) togglePlay();
        }, 33); // 33 ملي ثانية = سرعة 30FPS الحقيقية للفيديو (حركة واقعية جداً)
    }
}

if (slider) slider.addEventListener('input', function() { updateSimulation(parseInt(this.value, 10)); });
if (playBtn) playBtn.addEventListener('click', togglePlay);
if (resetBtn) resetBtn.addEventListener('click', () => {
    if (timer) togglePlay();
    if (slider) slider.value = 0;
    updateSimulation(0);
    map.fitBounds(plannedPolyline.getBounds(), { padding: [40, 40] });
});

let audioCtx = null;
let lastBeepTime = 0;

function triggerAudioAlert() {
    try {
        // تعريف الـ AudioContext مرة وحدة بس لمنع الـ Lag
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // نظام Throttle لمنع تداخل الأصوات (تأخير 300ms)
        const now = Date.now();
        if (now - lastBeepTime < 300) return;
        lastBeepTime = now;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch(e) {
        console.error("Audio Error: ", e);
    }
}

// --- 7. أداة التنبيهات اليدوية (Draggable Alert Tool) ---
const addAlertBtn = document.getElementById('add-alert-btn');
const alertPanel = document.getElementById('alert-panel');
let isPlacingAlert = false;
let selectedSeverityColor = '';
let selectedSeverityText = '';

if (addAlertBtn && alertPanel) {
    // فتح / إغلاق القائمة
    addAlertBtn.addEventListener('click', () => {
        alertPanel.classList.toggle('hidden');
    });

    // اختيار مستوى الخطر من القائمة
    document.querySelectorAll('.severity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const severity = e.target.dataset.severity; // low, medium, high
            
            if (severity === 'low') { selectedSeverityColor = 'green'; selectedSeverityText = 'منخفض الخطر'; }
            else if (severity === 'medium') { selectedSeverityColor = 'orange'; selectedSeverityText = 'متوسط الخطر'; }
            else if (severity === 'high') { selectedSeverityColor = 'red'; selectedSeverityText = 'شديد الخطورة'; }

            alertPanel.classList.add('hidden');
            isPlacingAlert = true;
            document.getElementById('map').style.cursor = 'crosshair';
            alert(`الآن اضغط على أي مكان بالخريطة لإضافة التنبيه اليدوي.`);
        });
    });
}

// رسم الماركر اليدوي عند الضغط على الخريطة
map.on('click', function(e) {
    if (!isPlacingAlert) return;

    const alertIcon = L.divIcon({
        html: `<div class="alert-marker ${selectedSeverityColor}">❗</div>`,
        className: 'custom-alert-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });

    // تفعيل خاصية الـ Draggable
    const manualMarker = L.marker(e.latlng, { 
        icon: alertIcon,
        draggable: true // تمكين السحب والإفلات
    }).addTo(map);

    const popupContent = `
        <div class="popup-card">
            <span class="popup-badge" style="background:#fffbeb;">رصد يدوي (قابل للسحب)</span>
            <div class="popup-title">مستوى الخطر: ${selectedSeverityText}</div>
            <div class="popup-desc" id="coords-${manualMarker._leaflet_id}">الإحداثيات: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}</div>
        </div>
    `;
    manualMarker.bindPopup(popupContent).openPopup();

    // تحديث الإحداثيات مباشرة عند سحب الماركر
    manualMarker.on('dragend', function(event) {
        const newPos = event.target.getLatLng();
        const coordsText = document.getElementById(`coords-${manualMarker._leaflet_id}`);
        if(coordsText) {
            coordsText.innerText = `الإحداثيات: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`;
        }
    });

    // إعادة وضع الخريطة الطبيعي
    isPlacingAlert = false;
    document.getElementById('map').style.cursor = '';
    
    activePotholesCount++;
    if (potholeCountEl) potholeCountEl.innerText = `${activePotholesCount} عوائق`;
});

// بدء التشغيل عند تحميل الصفحة
window.onload = () => {
    fetchAndRenderRoute();
};

// ميزة الانتقال المباشر للفريم (Frame Jump)
const frameInput = document.getElementById('frame-input');
if (frameInput) {
    frameInput.addEventListener('change', function() {
        let targetFrame = parseInt(this.value, 10);
        if (isNaN(targetFrame)) targetFrame = 0;
        
        // منع إدخال رقم أكبر من الفريمات أو أقل من 0
        targetFrame = Math.max(0, Math.min(targetFrame, totalFrames));
        
        this.value = targetFrame; // تحديث الرقم جوا الـ input
        if (slider) slider.value = targetFrame; // تحديث الـ slider
        updateSimulation(targetFrame); // تحريك السيارة فوراً
    });
}