# 🌋 MANGAN AI — Intelligent Manganese Exploration & Pit Shortfall Mitigation

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/PS_ID-SIH26009-brightgreen.svg)](#)
[![Ministry](https://img.shields.io/badge/Ministry-Ministry_of_Steel-orange.svg)](#)
[![Organization](https://img.shields.io/badge/PSU-MOIL_Limited-red.svg)](#)
[![Tech Readiness](https://img.shields.io/badge/TRL-Level_5_Verified-success.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **Team 21 — Ghost Terminal**  
> **Problem Statement:** *Using AI/ML and Space Technology to Identify Manganese Reserve and Overcome Production Shortfalls*  
> **Category:** Software | **Theme:** Smart Automation

---

## 📌 Executive Summary

**MANGAN AI** is an enterprise-grade web-based Decision Support & Geospatial Intelligence System designed for **MOIL Limited** and the **Ministry of Steel**. By fusing **Copernicus Sentinel-2 Multi-Spectral satellite remote sensing (SWIR-1 & SWIR-2 alteration bands)** with **borehole core drilling assays**, MANGAN AI predicts manganese ore grade distributions with high spatial precision ($R^2 = 0.75$) and forecasts open-cast pit production shortfalls 3–5 days ahead ($R^2 = 0.96$).

### Key Measurable Outcomes:
- **₹1.5–₹2.5 Cr Saved per Exploration Block:** Eliminates wasteful blind core drilling by prioritizing high-probability mineral alteration zones.
- **3,000–7,500 MT Recovered Monthly:** Anticipates monsoon pit disruptions and dynamically reallocates dumpers and shovels to dry upper benches.
- **UNFC-1997 Compliance:** Directly maps reserve predictions into Indian Bureau of Mines (IBM) G1, G2, and G3 resource confidence categories.

---

## 🏛️ System Architecture

```
                                  MANGAN AI ARCHITECTURE
                                  
  [ Space & Earth Observation ]     [ Subsurface Assays ]     [ Atmospheric Telemetry ]
      Sentinel-2 MSI (SWIR)         Borehole Core Drill Logs      Open-Meteo & Rain Gauges
                 │                              │                             │
                 └──────────────────────┬───────┴─────────────────────────────┘
                                        ▼
                           [ Feature Extraction Engine ]
                    • SWIR Mineral Ratio (B12 / B11)
                    • NDVI & Land Surface Temperature
                    • Soil Moisture Saturation Index
                    • Extraction Bench Depth (m)
                                        │
                                        ▼
                        [ Hybrid Machine Learning Models ]
            ┌───────────────────────────┴───────────────────────────┐
            ▼                                                       ▼
  [ Spatial Grade Estimator ]                              [ Pit Shortfall Forecaster ]
  • Isolation Forest Anomaly Filter                        • Multi-Feature Gradient Boosting
  • Random Forest Regressor (R²=0.75)                      • Dynamic Monsoon Rainfall Weighting
  • 5-Fold Spatial Cross-Validation                        • Operational Lead Time: 3-5 Days Ahead
            └───────────────────────────┬───────────────────────────┘
                                        ▼
                     [ Python REST API v1 & Data Layer ]
            • Multi-Threaded HTTP Server with 14 Relational Tables
            • HMAC-SHA256 JWT Authentication & 6 Mining RBAC Roles
            • Rate Limiting & Cryptographic Audit Trails
                                        │
                                        ▼
                     [ High-Performance Frontend Engine ]
            • Interactive Leaflet GIS with Multi-Layer Raster Tiling
            • 4-Question Closed Loop (What happened → Why → Will happen → Prescriptive Action)
            • Zero-Framework Vanilla JS Engine (Optimized for Rugged Field Tablets)
```

---

## ⚡ Core Features

1. **Live Spatial Prospectivity Heatmap:**
   - Multi-layer toggle: SWIR Mineral Alteration, Ore Probability, Plant Density (NDVI), Surface Temperature, Soil Moisture, and Blasting Delay Risk.
   - Interactive drillhole inspector with live model-versus-assay variance validation ($\pm0.5\%$).

2. **Predictive Pit Shortfall & Monsoon Forecasting:**
   - Forecasts production deficits caused by rainfall submergence, muddy haul roads, or excavator bottlenecks.
   - Proactive 7-day planning window with dewatering pump suggestions 72h before heavy downpours.

3. **What-If Scenario Simulation:**
   - Interactive parameters: Adjust rainfall intensity (mm/h), available excavator/dumper fleet, or shift hours to see projected output and shortfall impact in real time.

4. **Prescriptive Action Plan with Cost-Gain ROI:**
   - Ranked operational recommendations (e.g., *Start Submersible Pump #3*, *Divert Haul Route to North Ramp*, *Deploy Wet-Grade Tires*) with estimated execution costs and MT ore recovered.

5. **Enterprise Mining RBAC & Security:**
   - 6 Mining Roles: `CMD / Director`, `General Manager (Mines)`, `Senior Mining Engineer`, `Senior Geologist`, `Pit Supervisor`, and `Safety Officer`.
   - HMAC-SHA256 JWT bearer token authentication with sliding-window session security.

---

## 📁 Repository Structure

```
├── index.html                  # Responsive Single-Page Application (HTML5)
├── styles.css                  # Enterprise Design System & Styling (Vanilla CSS3)
├── app.js                      # GIS Engine, Leaflet Integration & Client State
├── server.py                   # Multi-Threaded Python REST API v1 Server
├── auth.py                     # JWT Authentication & RBAC Permission Engine
├── db.py                       # SQLite Database Engine & Schema Seeding
├── docs.py                     # OpenAPI/Swagger Interactive API Documentation
├── data_collector.py           # Multi-Spectral & Weather Data Ingestion Pipeline
├── train_manganese_model.py    # ML Training Pipeline (Random Forest & GBM)
├── test_prototype.py           # Automated Test Suite (26 Passing Verifications)
├── requirements.txt            # Python Dependencies
├── LICENSE                     # MIT License
└── data/                       # Datasets & Database Store
    ├── borehole_drilling_data.csv        # MOIL Balaghat Core Assays
    ├── historical_production_weather.csv # 3 Years of Operational & Weather Logs
    ├── manganese_probability_grid.json   # 1,764 Pre-Computed GIS Probability Cells
    ├── mangan_ai.db                      # Relational Database (14 Tables)
    ├── model_metrics.json                # Statistical Validation Metrics (R², MAE)
    └── realtime_weather.json             # Live Weather Telemetry Cache
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10 or higher installed.
- Any modern web browser (Chrome, Edge, Firefox).

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/MANGAN-AI.git
cd MANGAN-AI
```

### 2. (Optional) Install Dependencies
The core backend runs with **zero external dependencies** using the Python Standard Library. To run extended data science workflows:
```bash
pip install -r requirements.txt
```

### 3. Start the Server
Launch the unified REST API backend and frontend server:
```bash
python server.py
```
*The server will start at `http://localhost:8000`.*

### 4. Access the Application
- **Main GIS Dashboard:** Open [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation:** Open [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

---

## 🧪 Automated Testing

Verify the complete system integrity with the built-in test suite:
```bash
python test_prototype.py
```
*Executes 26 comprehensive automated tests across all endpoints, RBAC permissions, spatial calculations, and simulation engines.*

---

## 📊 Model Performance & Benchmarks

| Metric | Spatial Grade Model | Production Shortfall Model |
| :--- | :--- | :--- |
| **Algorithm** | Random Forest Regressor + Isolation Forest | Gradient Boosting Machine (GBM) |
| **Coefficient ($R^2$)** | **0.75** | **0.96** |
| **Mean Absolute Error (MAE)** | **2.22% Mn** | **697 MT** |
| **Root Mean Squared Error (RMSE)** | **2.76% Mn** | **1,523 MT** |
| **Validation Strategy** | 5-Fold Spatial Cross-Validation | Time-Series Forward-Chaining Split |

---

## 👥 Team — Ghost Terminal (Team 21)

- **Problem Statement ID:** SIH26009
- **Hackathon:** Smart India Hackathon 2026 (Internal & Grand Finale)
- **Organization:** Ministry of Steel / MOIL Limited

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
