import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontEnd')));

// In-Memory Database
let potholes = [
    {
        id: "ANO-3426-456",
        address: "32, Wasfi Al-Tal St, Gardens, Amman",
        lat: 31.9880,
        lng: 35.8850,
        severity: "Severe",
        status: "Ongoing",
        workProgress: "Emergency Repair",
        confidence: 0.97,
        ticketDate: "2026-10-09",
        incidentType: "Pothole",
        comments: ["Inspection drone confirmed depth ~12cm.", "Cracks observed near intersection."],
        images: [
            "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80",
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80"
        ]
    },
    {
        id: "ANO-3426-457",
        address: "Queen Rania St, Near University Mosque",
        lat: 31.9920,
        lng: 35.8780,
        severity: "Moderate",
        status: "In Progress",
        workProgress: "Scheduled Inspection",
        confidence: 0.89,
        ticketDate: "2026-10-08",
        incidentType: "Road Crack",
        comments: ["Scheduled for repaving."],
        images: ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80"]
    }
];

let municipalityReports = [
    {
        reportId: "REP-9901",
        potholeId: "ANO-3426-456",
        submittedAt: "2026-10-09T10:30:00Z",
        status: "Pending Review",
        department: "Greater Amman Municipality - Road Maintenance"
    }
];

// --- REST API Endpoints ---
app.get('/api/potholes', (req, res) => {
    res.json({ success: true, count: potholes.length, data: potholes });
});

app.post('/api/potholes', (req, res) => {
    const { address, lat, lng, severity, confidence, incidentType } = req.body;

    const newPothole = {
        id: `ANO-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`,
        address: address || "Detected Road Segment",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        severity: severity || "Moderate",
        status: "Ongoing",
        workProgress: "Pending Dispatch",
        confidence: confidence || 0.92,
        ticketDate: new Date().toISOString().split('T')[0],
        incidentType: incidentType || "Pothole",
        comments: ["Auto-created by RoadGuard AI detector"],
        images: ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80"]
    };

    potholes.unshift(newPothole);

    municipalityReports.unshift({
        reportId: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        potholeId: newPothole.id,
        submittedAt: new Date().toISOString(),
        status: "Submitted",
        department: "Public Works & Infrastructure"
    });

    res.status(201).json({ success: true, data: newPothole });
});

app.post('/api/potholes/:id/comments', (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    const pothole = potholes.find(p => p.id === id);
    if (!pothole) {
        return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    pothole.comments.push(comment);
    res.json({ success: true, comments: pothole.comments });
});

app.get('/api/reports', (req, res) => {
    res.json({ success: true, data: municipalityReports });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontEnd', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(` RoadGuard AI Server live at http://localhost:${PORT} 🚗💨`);
    console.log(`==========================================\n`);
});