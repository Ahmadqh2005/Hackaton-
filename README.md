# 🚗 RoadGuard AI - Pothole Detection Dashboard

## 📌 Overview
RoadGuard is a smart dashboard for simulating the detection of potholes and cracks on the Airport Road in Amman. The system maps AI data extracted from a real video and performs precise synchronization between the video and the map simulation, featuring a proactive alert system that warns the driver before reaching a pothole.

## ✨ Key Features
* **Map Simulation:** Live tracking of the car's route on the map based on precise distance calculations (7,900 meters).
* **Video Synchronization:** Synchronizes the video frames with the car's movement on the map (Master Clock Sync) to prevent lag or delay.
* **Proximity Alerts:** A UI system that displays a warning to the user only when the distance between the car and the nearest pothole is 200 meters or less.
* **Audio Notifications:** Audio alerts (beeps) trigger 15 frames before the pothole, built with a throttle system to prevent sound overlapping.
* **AI Confidence Mapping:** Classifies potholes based on the model's confidence accuracy with different colors (red for high risk, orange for medium, green for low).
* **Manual Draggable Alerts:** A tool that allows the user to manually add markers to report new potholes on the map and drag them to the exact location.

## 🛠️ Tech Stack & Libraries
* **Frontend:** HTML5, CSS3, Vanilla JavaScript.
* **Leaflet.js:** The core mapping library used to render the map, markers, and polylines[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span).
* **OpenStreetMap (OSM):** Provides the map tiles and base maps[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span).
* **OSRM API (Open Source Routing Machine):** Fetches the precise route coordinates between the start (A) and end (B) points[span_4](start_span)[span_4](end_span)[span_5](start_span)[span_5](end_span).
* **Web Audio API:** Generates warning sounds (Oscillator) directly from the browser without external audio files[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span).
* **Google Fonts (Cairo):** Used for the primary interface typography[span_8](start_span)[span_8](end_span)[span_9](start_span)[span_9](end_span).

## 📂 Project Structure
* `index.html`: Contains the layout, dashboard structure, and the video container[span_10](start_span)[span_10](end_span)[span_11](start_span)[span_11](end_span).
* `style.css`: Styles the UI using a Glassmorphism effect and organizes the video and map layout[span_12](start_span)[span_12](end_span)[span_13](start_span)[span_13](end_span).
* `script.js`: Contains all the logic (API Fetch, distance Math, video sync, and frame updates)[span_14](start_span)[span_14](end_span)[span_15](start_span)[span_15](end_span).
* `testVideo.mp4`: The field video used for synchronization.

## 🚀 Setup & Run
1. Download the files and place them all in a single folder.
2. Ensure the video file `testVideo.mp4` is located in the same folder as `index.html`.
3. Open the project using **Live Server** (crucial for the OSRM Fetch API to work without CORS issues).
4. Click the "Play Simulation" button and monitor the dashboard.
