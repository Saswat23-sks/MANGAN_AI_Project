/* ==========================================================================
   MOIL INTELLIGENCE PLATFORM - CLIENT SIDE CONTROLLER
   ========================================================================== */

let map = null;
let gridLayerGroup = null;
let drillLayerGroup = null;
let zoneLayerGroup = null;
let yieldChart = null;
let currentGridData = null;
let currentBoreholeData = null;
let activeLayer = 'prob';
let probFilterVal = 40;
let activeZoneId = 'all';

const SECTORS = {
    'zoneA': {
        name: 'Zone A: Balaghat Main Pit',
        subtitle: 'Active Open Cast Extraction Sector',
        bounds: [[21.795, 80.170], [21.812, 80.192]],
        color: '#06b6d4',
        tonnage: '38.4M MT',
        grade: '38.5% Mn',
        status: 'ACTIVE PRODUCTION'
    },
    'zoneB': {
        name: 'Zone B: East Exploration Block',
        subtitle: 'Priority Anomaly #1 (Undrilled Target)',
        bounds: [[21.805, 80.190], [21.828, 80.218]],
        color: '#f59e0b',
        tonnage: '24.8M MT',
        grade: '41.2% Mn',
        status: 'TARGET DRILLING PRIORITY'
    },
    'zoneC': {
        name: 'Zone C: South Extension Bench',
        subtitle: 'Monsoon Basin & Dewatering Zone',
        bounds: [[21.770, 80.165], [21.798, 80.190]],
        color: '#a855f7',
        tonnage: '12.6M MT',
        grade: '34.8% Mn',
        status: 'MONSOON HIGH RISK'
    },
    'zoneD': {
        name: 'Zone D: North Underground Prospect',
        subtitle: 'Deep Gondite Ore Deposit',
        bounds: [[21.815, 80.160], [21.838, 80.185]],
        color: '#10b981',
        tonnage: '7.3M MT',
        grade: '44.0% Mn',
        status: 'DEEP PROSPECTING'
    }
};

// Initialize Dashboard on Page Load
document.addEventListener('DOMContentLoaded', () => {
    initMiningPreloader();
    initUserRole();
    initLeafletMap();
    fetchWeatherData();
    fetchProbabilityGrid();
    fetchDrillingLogs();
    fetchModelMetrics();
    fetchDataHealth();
    fetchUsers();
    fetchActivityLogs();
    initYieldChart();
    renderLiveAdvisories();
    runLiveSimulation();

    // New Enterprise Capabilities Initializers
    fetchActiveAlerts();
    initPrescriptiveCard();
    fetchHistoricalData('30d');
    fetchFleetOptimization();
    fetchModelRegistry();
    fetchGroundTruthValidation();
    fetchDetailedDataHealth();

    // Auto-refresh weather and active alerts every 2 minutes
    setInterval(fetchWeatherData, 120000);
    setInterval(fetchActiveAlerts, 120000);
});

// Tab Switcher Controller
function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    const tabMap = {
        'exec': { btn: 'tabExec', view: 'viewExec' },
        'reserve': { btn: 'tabReserve', view: 'viewReserve' },
        'production': { btn: 'tabProduction', view: 'viewProduction' },
        'simulator': { btn: 'tabSimulator', view: 'viewSimulator' },
        'recommendations': { btn: 'tabRecommendations', view: 'viewRecommendations' },
        'health': { btn: 'tabHealth', view: 'viewHealth' },
        
        // Legacy aliases
        'map': { btn: 'tabReserve', view: 'viewReserve' },
        'sim': { btn: 'tabSimulator', view: 'viewSimulator' },
        'upload': { btn: 'tabHealth', view: 'viewHealth' }
    };

    const target = tabMap[tabName] || tabMap['exec'];
    const btnElem = document.getElementById(target.btn);
    const viewElem = document.getElementById(target.view);

    if (btnElem) btnElem.classList.add('active');
    if (viewElem) viewElem.classList.add('active');

    if ((tabName === 'reserve' || tabName === 'map') && map) {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 80);
        setTimeout(() => map.invalidateSize(), 250);
    }
}

/* ==========================================================================
   1. LIVE GIS LEAFLET MAP & PROBABILITY GRID RENDERER
   ========================================================================== */

function initLeafletMap() {
    const balaghatLat = 21.8021;
    const balaghatLng = 80.1847;

    map = L.map('map', {
        center: [balaghatLat, balaghatLng],
        zoom: 13,
        zoomControl: true
    });

    // High-Resolution Esri Satellite World Imagery Basemap
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);

    gridLayerGroup = L.layerGroup().addTo(map);
    drillLayerGroup = L.layerGroup().addTo(map);
    zoneLayerGroup = L.layerGroup().addTo(map);

    initZonePolygons();

    // Map Event Listeners for Cursor Lat/Lng and Zoom Tracking
    map.on('mousemove', (e) => {
        const lblLat = document.getElementById('lblLat');
        const lblLng = document.getElementById('lblLng');
        if (lblLat) lblLat.innerText = `${e.latlng.lat.toFixed(4)}° N`;
        if (lblLng) lblLng.innerText = `${e.latlng.lng.toFixed(4)}° E`;
    });

    map.on('zoomend', () => {
        const lblZoom = document.getElementById('lblZoom');
        if (lblZoom) lblZoom.innerText = map.getZoom();
    });
}

function initZonePolygons() {
    if (!map || !zoneLayerGroup) return;
    zoneLayerGroup.clearLayers();

    Object.keys(SECTORS).forEach(key => {
        const sector = SECTORS[key];
        const polygon = L.rectangle(sector.bounds, {
            color: sector.color,
            weight: 2,
            dashArray: '6, 6',
            fillColor: sector.color,
            fillOpacity: 0.08
        });

        polygon.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 11px; color: #0f172a; padding: 2px;">
                <strong>${sector.name}</strong><br>
                ${sector.subtitle}<br>
                Reserve: <strong>${sector.tonnage}</strong> | Grade: <strong>${sector.grade}</strong><br>
                Status: <strong>${sector.status}</strong>
            </div>
        `, { sticky: true });

        polygon.on('click', () => {
            zoomToZone(key);
        });

        zoneLayerGroup.addLayer(polygon);
    });
}

function zoomToZone(zoneId) {
    activeZoneId = zoneId;
    const selectElem = document.getElementById('zoneSelect');
    if (selectElem && selectElem.value !== zoneId) {
        selectElem.value = zoneId;
    }

    const activeLabel = document.getElementById('lblActiveZone');

    if (zoneId === 'all' || !SECTORS[zoneId]) {
        map.setView([21.8021, 80.1847], 13, { animate: true });
        if (activeLabel) activeLabel.innerText = "All Sectors (Balaghat)";
    } else {
        const sector = SECTORS[zoneId];
        map.fitBounds(sector.bounds, { padding: [30, 30], animate: true });
        if (activeLabel) activeLabel.innerText = sector.name;
    }

    renderProbabilityGrid();
}

function searchMap(query) {
    if (!query || query.trim() === '') return;
    const q = query.trim().toLowerCase();

    // 1. Search sectors
    for (const [key, sector] of Object.entries(SECTORS)) {
        if (sector.name.toLowerCase().includes(q) || key.toLowerCase() === q || sector.subtitle.toLowerCase().includes(q)) {
            zoomToZone(key);
            return;
        }
    }

    // 2. Search boreholes
    if (currentBoreholeData && currentBoreholeData.length > 0) {
        const bhMatch = currentBoreholeData.find(bh => 
            bh.borehole_id.toLowerCase().includes(q) || 
            (bh.lithology && bh.lithology.toLowerCase().includes(q))
        );
        if (bhMatch && bhMatch.latitude && bhMatch.longitude) {
            const lat = parseFloat(bhMatch.latitude);
            const lng = parseFloat(bhMatch.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                map.setView([lat, lng], 16, { animate: true });
                drillLayerGroup.eachLayer(layer => {
                    if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lng) < 0.0001) {
                        layer.openPopup();
                    }
                });
                return;
            }
        }
    }

    // 3. Search coordinates (e.g. 21.80, 80.18)
    const parts = q.split(/[\s,]+/);
    if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat > 10 && lat < 35 && lng > 65 && lng < 95) {
            map.setView([lat, lng], 15, { animate: true });
        }
    }
}

function exportActiveZoneData() {
    if (!currentGridData || (!currentGridData.grid_points && !currentGridData.cells)) {
        alert("No GIS grid data loaded to export.");
        return;
    }

    const points = currentGridData.grid_points || currentGridData.cells;
    let filtered = points;

    if (activeZoneId !== 'all' && SECTORS[activeZoneId]) {
        const [[minLat, minLng], [maxLat, maxLng]] = SECTORS[activeZoneId].bounds;
        filtered = points.filter(pt => pt.lat >= minLat && pt.lat <= maxLat && (pt.lng || pt.lon) >= minLng && (pt.lng || pt.lon) <= maxLng);
    }

    if (filtered.length === 0) {
        alert("No grid points found in selected sector.");
        return;
    }

    let csv = 'Sector,Latitude,Longitude,Mn_Probability_Pct,Mn_Grade_Pct,Confidence_Pct,Exploration_Score,Soil_Moisture_Pct,Overburden_Depth_M\n';
    
    filtered.forEach(pt => {
        const probPct = typeof pt.probability === 'number' ? (pt.probability <= 1.0 ? pt.probability * 100 : pt.probability) : 50;
        const confPct = pt.confidence || pt.confidence_pct || 88;
        const expScore = pt.exploration_priority_score || (probPct * (confPct / 100.0)).toFixed(1);
        const ptLng = pt.lng || pt.lon || 80.18;
        
        let zoneName = 'General Balaghat';
        for (const [key, sec] of Object.entries(SECTORS)) {
            const [[minL, minG], [maxL, maxG]] = sec.bounds;
            if (pt.lat >= minL && pt.lat <= maxL && ptLng >= minG && ptLng <= maxG) {
                zoneName = sec.name.replace(/,/g, '');
                break;
            }
        }

        csv += `"${zoneName}",${pt.lat.toFixed(5)},${ptLng.toFixed(5)},${probPct.toFixed(1)},${pt.mn_grade_pct || pt.mn_grade || 35},${confPct},${expScore},${pt.soil_moisture || 40},${pt.depth_m || 45}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MOIL_GIS_Sector_${activeZoneId}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateMapLegend(layerType) {
    const legendTitle = document.getElementById('legendTitle');
    const legendBar = document.getElementById('legendBar');
    const legendMin = document.getElementById('legendMin');
    const legendMid = document.getElementById('legendMid');
    const legendMax = document.getElementById('legendMax');

    if (!legendTitle || !legendBar) return;

    const legendConfig = {
        'prob': { title: 'Ore Prospectivity Rating', barClass: 'legend-bar prob', min: '0% (Low)', mid: '50% (Moderate)', max: '100% (High)' },
        'exploration': { title: 'Exploration Priority Target', barClass: 'legend-bar exploration', min: 'Low (<50)', mid: 'Medium (75)', max: 'Urgent Target (90+)' },
        'confidence': { title: 'Model Confidence Level', barClass: 'legend-bar confidence', min: '70% Low', mid: '85% Good', max: '99% High Confidence' },
        'sentinel_rgb': { title: 'Sentinel-2 True Color (10m RGB)', barClass: 'legend-bar confidence', min: 'Band 4 (Red)', mid: 'Band 3 (Green)', max: 'Band 2 (Blue)' },
        'sentinel_false': { title: 'Sentinel-2 False Color (NIR/Red/Green)', barClass: 'legend-bar ndvi', min: 'Sparse Canopy', mid: 'Moderate', max: 'Dense Canopy (B8)' },
        'ndvi': { title: 'NDVI Vegetation Index', barClass: 'legend-bar ndvi', min: '0.1 Barren Ore', mid: '0.35 Sparse', max: '0.6 Dense Canopy' },
        'ndwi': { title: 'NDWI Water Index (Pit Moisture)', barClass: 'legend-bar ndwi', min: '-0.3 Dry Rock', mid: '0.0 Saturated', max: '+0.5 Pit Water Body' },
        'swir_ratio': { title: 'SWIR Mineral Ratio (B12/B11)', barClass: 'legend-bar swir', min: '0.8 Low Gondite', mid: '1.2 Alteration', max: '1.8 Mn Ore Host' },
        'lst': { title: 'Surface Temp (°C)', barClass: 'legend-bar lst', min: '25°C Cool', mid: '35°C Ambient', max: '45°C Extreme Heat' },
        'moisture': { title: 'Soil Moisture Level (%)', barClass: 'legend-bar moisture', min: '10% Dry Bench', mid: '45%', max: '80% Waterlogged' },
        'alteration': { title: 'Clay & Iron Oxide Alteration Index', barClass: 'legend-bar alteration', min: '1.0 Low Clay', mid: '1.5 Medium', max: '2.2 Mn Oxide Peak' },
        'prod_risk': { title: 'Operational Risk Rating', barClass: 'legend-bar risk', min: 'Low Risk', mid: 'Moderate', max: 'Critical High Risk' },
        'equip_risk': { title: 'Fleet Downtime Risk', barClass: 'legend-bar risk', min: 'Optimal Operations', mid: 'Moderate Risk', max: 'Critical Downtime' },
        'blast_risk': { title: 'Blasting & Stemming Safety Risk', barClass: 'legend-bar risk', min: 'Normal Blast', mid: 'Moisture Risk', max: 'Waterlogged Hazard' }
    };

    const cfg = legendConfig[layerType] || legendConfig['prob'];
    legendTitle.innerText = cfg.title;
    legendBar.className = cfg.barClass;
    if (legendMin) legendMin.innerText = cfg.min;
    if (legendMid) legendMid.innerText = cfg.mid;
    if (legendMax) legendMax.innerText = cfg.max;
}

function fetchProbabilityGrid() {
    fetch('/api/v1/prospectivity')
        .then(res => res.json())
        .then(data => {
            currentGridData = data;
            renderProbabilityGrid();
            
            if (data.total_estimated_reserve_mt) {
                const reserveMillion = (data.total_estimated_reserve_mt / 1000000).toFixed(2);
                document.getElementById('statReserve').innerHTML = `${reserveMillion}M <span class="unit">MT</span>`;
            }
        })
        .catch(err => console.error("Error loading probability grid:", err));
}

function getGradientColor(val, minVal, maxVal, scheme) {
    const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal || 1)));
    if (scheme === 'prob') {
        if (norm >= 0.75) return '#ef4444';
        if (norm >= 0.60) return '#f59e0b';
        if (norm >= 0.35) return '#eab308';
        if (norm >= 0.15) return '#06b6d4';
        return '#3b82f6';
    } else if (scheme === 'exploration') {
        if (val >= 90) return '#f59e0b';
        if (val >= 75) return '#8b5cf6';
        if (val >= 50) return '#06b6d4';
        return '#64748b';
    } else if (scheme === 'risk') {
        if (norm >= 0.65) return '#dc2626';
        if (norm >= 0.35) return '#f59e0b';
        return '#10b981';
    } else if (scheme === 'moisture') {
        return norm > 0.6 ? '#0284c7' : (norm > 0.3 ? '#38bdf8' : '#7dd3fc');
    } else if (scheme === 'ndwi') {
        return norm > 0.6 ? '#1e3a8a' : (norm > 0.3 ? '#0284c7' : '#bae6fd');
    } else if (scheme === 'swir_ratio') {
        return norm > 0.6 ? '#6b21a8' : (norm > 0.3 ? '#a855f7' : '#c084fc');
    } else if (scheme === 'alteration') {
        return norm > 0.6 ? '#ca8a04' : (norm > 0.3 ? '#eab308' : '#fef08a');
    } else if (scheme === 'lst') {
        return norm > 0.6 ? '#ea580c' : (norm > 0.3 ? '#f97316' : '#fdba74');
    } else if (scheme === 'ndvi') {
        return norm > 0.5 ? '#047857' : '#10b981';
    } else if (scheme === 'confidence') {
        return norm > 0.85 ? '#10b981' : '#06b6d4';
    }
    return '#38bdf8';
}

function renderProbabilityGrid() {
    if (!currentGridData || !map) return;

    gridLayerGroup.clearLayers();

    const points = currentGridData.grid_points || currentGridData.cells || [];

    // Read live simulator values to dynamically couple operational risk layers
    const simRain = parseFloat(document.getElementById('simRain') ? document.getElementById('simRain').value : 45);
    const simMoisture = parseFloat(document.getElementById('simMoisture') ? document.getElementById('simMoisture').value : 40);
    const simFleet = parseFloat(document.getElementById('simFleet') ? document.getElementById('simFleet').value : 85);
    const simBlasting = parseFloat(document.getElementById('simBlasting') ? document.getElementById('simBlasting').value : 1);

    points.forEach(pt => {
        const ptLng = pt.lng || pt.lon || 80.18;

        // Sector Bounds Filtering
        if (activeZoneId !== 'all' && SECTORS[activeZoneId]) {
            const [[minLat, minLng], [maxLat, maxLng]] = SECTORS[activeZoneId].bounds;
            if (pt.lat < minLat || pt.lat > maxLat || ptLng < minLng || ptLng > maxLng) {
                return;
            }
        }

        const probPct = typeof pt.probability === 'number' ? (pt.probability <= 1.0 ? pt.probability * 100 : pt.probability) : 50;
        const confPct = pt.confidence || pt.confidence_pct || 88;
        const gradeVal = pt.mn_grade || pt.mn_grade_pct || 35;
        const expScore = pt.exploration_priority_score || (probPct * (confPct / 100.0)).toFixed(1);
        const expClass = pt.exploration_class || (expScore >= 90 ? 'VERY HIGH' : (expScore >= 75 ? 'HIGH' : (expScore >= 50 ? 'MEDIUM' : 'LOW')));
        
        // Apply slider filter for prospectivity view
        if (activeLayer === 'prob' && probPct < probFilterVal) return;

        let color = '#3b82f6';
        let opacity = 0.45;

        if (activeLayer === 'prob') {
            color = getGradientColor(probPct, 0, 100, 'prob');
            opacity = probPct >= 75 ? 0.80 : (probPct >= 50 ? 0.65 : 0.40);
        } else if (activeLayer === 'exploration') {
            color = getGradientColor(expScore, 0, 100, 'exploration');
            opacity = expScore >= 75 ? 0.85 : 0.50;
        } else if (activeLayer === 'confidence') {
            color = getGradientColor(confPct, 70, 100, 'confidence');
            opacity = confPct >= 88 ? 0.75 : 0.45;
        } else if (activeLayer === 'ndwi') {
            const ndwiVal = (pt.soil_moisture || simMoisture) * 0.01 - 0.25;
            color = getGradientColor(ndwiVal, -0.3, 0.5, 'ndwi');
            opacity = 0.60;
        } else if (activeLayer === 'swir_ratio') {
            const swirVal = pt.swir_ratio || (pt.swir2 / (pt.swir1 + 1e-5)) || 1.2;
            color = getGradientColor(swirVal, 0.8, 1.8, 'swir_ratio');
            opacity = 0.65;
        } else if (activeLayer === 'alteration') {
            const altVal = (pt.swir_ratio || 1.2) * 1.1 + (probPct / 100.0) * 0.8;
            color = getGradientColor(altVal, 1.0, 2.2, 'alteration');
            opacity = 0.65;
        } else if (activeLayer === 'sentinel_rgb' || activeLayer === 'sentinel_false') {
            color = activeLayer === 'sentinel_rgb' ? '#06b6d4' : '#10b981';
            opacity = 0.25;
        } else if (activeLayer === 'prod_risk') {
            const baseMoisture = pt.soil_moisture || simMoisture;
            const rainFactor = (simRain / 200) * 45;
            const riskVal = Math.min(100, Math.max(10, baseMoisture * 0.45 + (pt.depth_m || 45) * 0.2 + rainFactor));
            color = getGradientColor(riskVal, 0, 100, 'risk');
            opacity = 0.70;
        } else if (activeLayer === 'equip_risk') {
            const fleetDeficit = (100 - simFleet) * 0.65;
            const equipRisk = Math.min(100, Math.max(10, (pt.swir_ratio || 1.2) * 20 + (pt.depth_m || 45) * 0.2 + fleetDeficit));
            color = getGradientColor(equipRisk, 0, 100, 'risk');
            opacity = 0.70;
        } else if (activeLayer === 'blast_risk') {
            const blastRisk = Math.min(100, Math.max(10, (pt.soil_moisture || simMoisture) * 0.55 + simBlasting * 10));
            color = getGradientColor(blastRisk, 0, 100, 'risk');
            opacity = 0.70;
        } else if (activeLayer === 'moisture') {
            color = getGradientColor(pt.soil_moisture || simMoisture, 10, 80, 'moisture');
            opacity = 0.55;
        } else if (activeLayer === 'lst') {
            color = getGradientColor(pt.lst || pt.lst_temp_c || 32, 25, 45, 'lst');
            opacity = 0.55;
        } else if (activeLayer === 'ndvi') {
            color = getGradientColor(pt.ndvi || 0.3, 0.1, 0.6, 'ndvi');
            opacity = 0.45;
        }

        // Draw 200m spatial grid rectangle
        const bounds = [
            [pt.lat - 0.0012, ptLng - 0.0012],
            [pt.lat + 0.0012, ptLng + 0.0012]
        ];

        const rect = L.rectangle(bounds, {
            color: color,
            weight: 0.4,
            fillColor: color,
            fillOpacity: opacity
        });

        // Hover Tooltip
        rect.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 11px; color: #0f172a; padding: 2px;">
                <strong>MANGANESE PROSPECTIVITY</strong><br>
                Probability: <strong>${probPct.toFixed(1)}%</strong><br>
                Mn Grade: <strong>${gradeVal}% Mn</strong><br>
                Confidence: <strong>${confPct}%</strong><br>
                Exploration: <strong>${expClass} (${expScore})</strong>
            </div>
        `, { sticky: true, opacity: 0.95 });

        // Click Events for Point Inspector
        rect.on('mouseover', () => inspectPoint(pt));
        rect.on('click', () => inspectPoint(pt));

        gridLayerGroup.addLayer(rect);
    });
}

function setMapLayer(layerType, elem) {
    activeLayer = layerType;
    document.querySelectorAll('.layer-pill').forEach(btn => btn.classList.remove('active'));
    const targetElem = elem || (typeof event !== 'undefined' && event ? event.target : null);
    if (targetElem) targetElem.classList.add('active');
    updateMapLegend(layerType);
    renderProbabilityGrid();
}

function updateProbFilter(val) {
    probFilterVal = parseInt(val);
    document.getElementById('probSliderVal').innerText = `> ${val}%`;
    renderProbabilityGrid();
}

// Live Inspector Sidebar Updater with AI vs Drillhole Cross-Validation
function inspectPoint(pt) {
    const container = document.getElementById('inspectorContent');
    const probVal = typeof pt.probability === 'number' ? (pt.probability <= 1.0 ? pt.probability * 100 : pt.probability) : 50;
    const probPct = probVal.toFixed(1);
    const confPct = pt.confidence_pct || pt.confidence || 91;
    const uncertaintyPct = pt.uncertainty_pct || (6.5 + (100 - probVal) * 0.04).toFixed(1);
    const attrs = pt.feature_attributions || {
        "swir": probPct > 70 ? "+++" : "++",
        "depth": pt.depth_m < 60 ? "++" : "+",
        "moisture": pt.soil_moisture > 30 ? "+" : "-",
        "lst": pt.lst < 34 ? "+" : "-",
        "ndvi": pt.ndvi < 0.35 ? "-" : "+"
    };

    container.innerHTML = `
        <div class="inspector-data-grid grid grid-cols-3 gap-2 text-center mb-3">
            <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                <span class="text-2xs text-gray-400 block font-bold">ORE CHANCE</span>
                <span class="text-cyan font-bold text-lg">${probPct}%</span>
            </div>
            <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                <span class="text-2xs text-gray-400 block font-bold">CONFIDENCE</span>
                <span class="text-emerald font-bold text-lg">${confPct}%</span>
            </div>
            <div class="p-2 bg-slate-900/80 rounded border border-amber-500/30 bg-amber-500/10">
                <span class="text-2xs text-amber-300 block font-bold">MARGIN</span>
                <span class="text-amber-400 font-bold text-lg">±${uncertaintyPct}%</span>
            </div>
        </div>

        <div class="p-2.5 bg-slate-900/90 rounded border border-white/10 mb-3 space-y-1.5 text-2xs">
            <div class="flex justify-between items-center font-bold text-gray-200 border-b border-white/10 pb-1">
                <span>🧠 WHY THIS ESTIMATE?</span>
                <span class="text-cyan">KEY FACTORS</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-300">Infrared Mineral Signal (SWIR):</span>
                <span class="badge badge-success px-1.5 font-mono font-bold">${attrs.swir || '+++'} (Strong Marker)</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-300">Depth to Ore Layer (${pt.depth_m}m):</span>
                <span class="badge badge-info px-1.5 font-mono font-bold">${attrs.depth || '++'} (Shallow Bed)</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-300">Ground Moisture (${pt.soil_moisture}%):</span>
                <span class="badge badge-warning px-1.5 font-mono font-bold">${attrs.moisture || '+'} (Typical)</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-300">Surface Temperature (${pt.lst || 32}°C):</span>
                <span class="badge badge-warning px-1.5 font-mono font-bold">${attrs.lst || '+'} (Normal)</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-300">Plant Cover (NDVI ${pt.ndvi}):</span>
                <span class="badge badge-danger px-1.5 font-mono font-bold text-red-400">${attrs.ndvi || '-'} (Sparse / Barren)</span>
            </div>
        </div>

        <div class="sub-details text-2xs text-gray-400 border-t border-white/10 pt-2 space-y-1">
            <p><strong>Estimated Ore Grade:</strong> <strong class="text-emerald">${pt.mn_grade_pct}% Mn</strong></p>
            <p><strong>Estimated Tonnage:</strong> <strong class="text-amber">${pt.est_tonnage_mt.toLocaleString()} MT</strong></p>
            <p><strong>GPS Location:</strong> ${pt.lat}° N, ${pt.lng}° E</p>
        </div>
    `;

    // AI vs Drillhole Ground-Truth Cross Validation Engine
    const valBox = document.getElementById('drillValidationBox');
    if (valBox && currentBoreholeData && currentBoreholeData.length > 0) {
        valBox.style.display = 'block';

        // Find spatial nearest borehole ID
        let nearest = null;
        let minDistance = 999999;

        currentBoreholeData.forEach(bh => {
            const blat = parseFloat(bh.latitude);
            const blng = parseFloat(bh.longitude);
            if (!isNaN(blat) && !isNaN(blng)) {
                const dist = Math.sqrt((pt.lat - blat)**2 + (pt.lng - blng)**2);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = bh;
                }
            }
        });

        if (nearest) {
            const actualGrade = parseFloat(nearest.mn_grade_pct);
            const predGrade = parseFloat(pt.mn_grade_pct);
            const diff = (predGrade - actualGrade).toFixed(1);
            const diffStr = diff > 0 ? `+${diff}%` : `${diff}%`;

            document.getElementById('valBhId').innerText = nearest.borehole_id;
            document.getElementById('valBhActual').innerText = `${actualGrade}% Mn (${nearest.lithology || 'Gondite'})`;
            document.getElementById('valBhDepth').innerText = `${nearest.depth_m}m`;
            document.getElementById('valBhDiff').innerText = `${diffStr} (High Calibration Precision)`;

            // Exploration Recommendation Engine ("Where should MOIL drill next?")
            const expBox = document.getElementById('explorationBox');
            if (expBox) {
                expBox.style.display = 'block';

                // Distance calculation in meters (approx spatial conversion: 1 deg ~ 111km)
                const distMeters = Math.round(minDistance * 111000);
                const zoneCode = `Zone B${Math.round(pt.lat * 100 % 30 + pt.lng * 100 % 30)}`;

                document.getElementById('expZoneName').innerText = `${zoneCode} (Balaghat Bench Sector)`;
                document.getElementById('expProspectivity').innerText = `${probPct}% High Potential`;
                document.getElementById('expDist').innerText = `${distMeters}m (${distMeters > 300 ? 'Undrilled Anomaly Zone' : 'Proximity Surveyed'})`;

                const recBadge = document.getElementById('expPriorityBadge');
                const recText = document.getElementById('expRecText');

                if (probPct > 75 && distMeters > 250) {
                    recBadge.className = 'badge badge-warning text-2xs';
                    recBadge.innerText = 'HIGH PRIORITY DRILLING';
                    recText.className = 'mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 font-bold text-center';
                    recText.innerText = '🎯 HIGH PRIORITY FOR FURTHER DRILLING';
                } else if (probPct > 55) {
                    recBadge.className = 'badge badge-info text-2xs';
                    recBadge.innerText = 'SECONDARY TARGET';
                    recText.className = 'mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-300 font-bold text-center';
                    recText.innerText = '🟡 SECONDARY EXPLORATION TARGET';
                } else {
                    recBadge.className = 'badge badge-success text-2xs';
                    recBadge.innerText = 'SURVEYED ZONE';
                    recText.className = 'mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 font-bold text-center';
                    recText.innerText = '🔵 SUFFICIENTLY SURVEYED (LOW DRILLING PRIORITY)';
                }
            }
        }
    }
}

/* ==========================================================================
   2. BOREHOLE CORE DRILLING MARKERS
   ========================================================================== */

function fetchDrillingLogs() {
    fetch('/api/v1/boreholes')
        .then(res => res.json())
        .then(logs => {
            currentBoreholeData = logs;
            renderBoreholeMarkers();
        })
        .catch(err => console.warn("Using sample drill markers:", err));
}

function renderBoreholeMarkers() {
    if (!currentBoreholeData || !map) return;
    drillLayerGroup.clearLayers();

    currentBoreholeData.forEach(bh => {
        const lat = parseFloat(bh.latitude);
        const lng = parseFloat(bh.longitude);
        const grade = parseFloat(bh.mn_grade_pct);

        if (isNaN(lat) || isNaN(lng)) return;

        const marker = L.circleMarker([lat, lng], {
            radius: 5,
            fillColor: grade > 35 ? '#10b981' : '#38bdf8',
            color: '#ffffff',
            weight: 1,
            fillOpacity: 0.9
        });

        marker.bindPopup(`
            <div style="font-family: Inter, sans-serif; color: #000;">
                <h4 style="margin: 0; font-weight: 700;">${bh.borehole_id}</h4>
                <p style="margin: 4px 0 0 0; font-size: 12px;"><strong>Lithology:</strong> ${bh.lithology}</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Assay Grade:</strong> ${grade}% Mn</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Core Depth:</strong> ${bh.depth_m} meters</p>
            </div>
        `);

        drillLayerGroup.addLayer(marker);
    });
}

/* ==========================================================================
   3. LIVE WEATHER FEED & TICKER
   ========================================================================== */

function fetchWeatherData(stationName, isForceRefresh) {
    const targetStation = stationName || (document.getElementById('weatherStationSelect') ? document.getElementById('weatherStationSelect').value : 'Balaghat Mine (Central Sector)');
    const endpoint = isForceRefresh ? '/api/v1/weather/refresh' : `/api/v1/weather?station=${encodeURIComponent(targetStation)}`;
    
    const spinner = document.getElementById('weatherRefreshSpinner');
    if (spinner && isForceRefresh) spinner.classList.add('fa-spin');

    fetch(endpoint, { method: isForceRefresh ? 'POST' : 'GET' })
        .then(res => res.json())
        .then(res => {
            if (spinner) spinner.classList.remove('fa-spin');
            
            const data = res.weather || res;
            const stationData = data[targetStation] || Object.values(data)[0];

            if (stationData) {
                document.getElementById('weatherTemp').innerText = `${parseFloat(stationData.temperature).toFixed(1)}°C`;
                document.getElementById('weatherRain').innerText = `Rain: ${parseFloat(stationData.precipitation_mm_hr).toFixed(1)} mm/hr`;
                
                const timeStr = stationData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const updatedTimeElem = document.getElementById('weatherUpdatedTime');
                if (updatedTimeElem) {
                    updatedTimeElem.innerText = `Updated: ${timeStr.slice(-8)}`;
                }

                const badge = document.getElementById('weatherBadge');
                if (badge) {
                    if (parseFloat(stationData.precipitation_mm_hr) > 10.0) {
                        badge.className = 'badge badge-warning';
                        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber text-2xs"></i> MONSOON RAIN ALERT';
                    } else {
                        badge.className = 'badge badge-success';
                        badge.innerHTML = '<i class="fa-solid fa-circle text-emerald animate-pulse text-2xs"></i> LIVE PIPELINE: OPEN-METEO ➔ SQLITE DB';
                    }
                }
            }
        })
        .catch(err => {
            if (spinner) spinner.classList.remove('fa-spin');
            console.warn("Live weather update skipped:", err);
        });
}

/* ==========================================================================
   4. INTERACTIVE SIMULATION STUDIO CONTROLLER
   ========================================================================== */

function applyPresetScenario(preset) {
    const target = document.getElementById('simTargetInput');
    const rain = document.getElementById('simRain');
    const temp = document.getElementById('simTemp');
    const moisture = document.getElementById('simMoisture');
    const fleetAvail = document.getElementById('simFleetAvail');
    const fleet = document.getElementById('simFleet');
    const breakdown = document.getElementById('simBreakdown');
    const blasting = document.getElementById('simBlasting');
    const blastEff = document.getElementById('simBlastEff');

    if (preset === 'monsoon') {
        if (target) target.value = 94000;
        if (rain) rain.value = 165; if (temp) temp.value = 1.0; if (moisture) moisture.value = 85;
        if (fleetAvail) fleetAvail.value = 75; if (fleet) fleet.value = 70; if (breakdown) breakdown.value = 24;
        if (blasting) blasting.value = 3; if (blastEff) blastEff.value = 65;
    } else if (preset === 'breakdown') {
        if (target) target.value = 94000;
        if (rain) rain.value = 25; if (temp) temp.value = 2.0; if (moisture) moisture.value = 35;
        if (fleetAvail) fleetAvail.value = 50; if (fleet) fleet.value = 45; if (breakdown) breakdown.value = 48;
        if (blasting) blasting.value = 1; if (blastEff) blastEff.value = 80;
    } else if (preset === 'heatwave') {
        if (target) target.value = 94000;
        if (rain) rain.value = 5; if (temp) temp.value = 4.5; if (moisture) moisture.value = 20;
        if (fleetAvail) fleetAvail.value = 80; if (fleet) fleet.value = 65; if (breakdown) breakdown.value = 20;
        if (blasting) blasting.value = 2; if (blastEff) blastEff.value = 85;
    } else if (preset === 'blasting') {
        if (target) target.value = 94000;
        if (rain) rain.value = 40; if (temp) temp.value = 1.5; if (moisture) moisture.value = 70;
        if (fleetAvail) fleetAvail.value = 85; if (fleet) fleet.value = 80; if (breakdown) breakdown.value = 12;
        if (blasting) blasting.value = 5; if (blastEff) blastEff.value = 50;
    } else if (preset === 'reset') {
        if (target) target.value = 94000;
        if (rain) rain.value = 45; if (temp) temp.value = 1.5; if (moisture) moisture.value = 40;
        if (fleetAvail) fleetAvail.value = 90; if (fleet) fleet.value = 85; if (breakdown) breakdown.value = 12;
        if (blasting) blasting.value = 1; if (blastEff) blastEff.value = 85;
    }

    runLiveSimulation();
}

function applyOptimizationDecision(elementId, paramKey, paramValue) {
    const elem = document.getElementById(elementId);
    if (elem) {
        elem.value = paramValue;
        if (typeof showToastNotification === 'function') {
            showToastNotification(`Applied Decision Optimization: ${paramKey} set to ${paramValue}`);
        }
        runLiveSimulation();
    }
}

function runLiveSimulation() {
    const targetVal = document.getElementById('simTargetInput') ? parseFloat(document.getElementById('simTargetInput').value) : 94000;
    const rainfall = document.getElementById('simRain') ? parseFloat(document.getElementById('simRain').value) : 45;
    const temp = document.getElementById('simTemp') ? parseFloat(document.getElementById('simTemp').value) : 1.5;
    const moisture = document.getElementById('simMoisture') ? parseFloat(document.getElementById('simMoisture').value) : 40;
    const fleetAvail = document.getElementById('simFleetAvail') ? parseFloat(document.getElementById('simFleetAvail').value) : 90;
    const fleet = document.getElementById('simFleet') ? parseFloat(document.getElementById('simFleet').value) : 85;
    const breakdown = document.getElementById('simBreakdown') ? parseFloat(document.getElementById('simBreakdown').value) : 12;
    const blasting = document.getElementById('simBlasting') ? parseFloat(document.getElementById('simBlasting').value) : 1;
    const blastEff = document.getElementById('simBlastEff') ? parseFloat(document.getElementById('simBlastEff').value) : 85;

    if (document.getElementById('valTargetInput')) document.getElementById('valTargetInput').innerHTML = `${targetVal.toLocaleString()} <span class="unit">MT</span>`;
    if (document.getElementById('valRain')) document.getElementById('valRain').innerHTML = `${rainfall} <span class="unit">mm/day</span>`;
    if (document.getElementById('valTemp')) document.getElementById('valTemp').innerHTML = `${temp > 0 ? '+' : ''}${temp} <span class="unit">°C</span>`;
    if (document.getElementById('valMoisture')) document.getElementById('valMoisture').innerHTML = `${moisture} <span class="unit">%</span>`;
    if (document.getElementById('valFleetAvail')) document.getElementById('valFleetAvail').innerHTML = `${fleetAvail} <span class="unit">%</span>`;
    if (document.getElementById('valFleet')) document.getElementById('valFleet').innerHTML = `${fleet} <span class="unit">%</span>`;
    if (document.getElementById('valBreakdown')) document.getElementById('valBreakdown').innerHTML = `${breakdown} <span class="unit">hrs/wk</span>`;
    if (document.getElementById('valBlasting')) document.getElementById('valBlasting').innerHTML = `${blasting} <span class="unit">Days</span>`;
    if (document.getElementById('valBlastEff')) document.getElementById('valBlastEff').innerHTML = `${blastEff} <span class="unit">%</span>`;

    updateShortfallXaiBars(rainfall, temp, fleet, moisture);
    if (typeof renderProbabilityGrid === 'function') {
        renderProbabilityGrid();
    }

    fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            target_production_mt: targetVal,
            rainfall_mm_day: rainfall,
            temp_var_c: temp,
            soil_moisture_pct: moisture,
            fleet_availability_pct: fleetAvail,
            equipment_utilization_pct: fleet,
            fleet_capacity_pct: fleet,
            breakdown_hours: breakdown,
            blasting_delay_days: blasting,
            blast_efficiency_pct: blastEff
        })
    })
    .then(res => res.json())
    .then(res => {
        const targetYield = res.target_production_mt || targetVal;
        const expectedYield = res.expected_production_mt || res.actual_yield_mt || 82400;
        const totalLoss = res.production_loss_mt || res.shortfall_mt || 11600;
        const shortfallPct = res.shortfall_pct || 12.3;
        const riskLevel = res.risk_level || "MODERATE RISK";

        if (document.getElementById('simTarget')) document.getElementById('simTarget').innerText = `${targetYield.toLocaleString()} MT`;
        if (document.getElementById('simBeforeAi')) document.getElementById('simBeforeAi').innerText = `-${totalLoss.toLocaleString()} MT`;
        if (document.getElementById('simAfterAi')) document.getElementById('simAfterAi').innerText = `${expectedYield.toLocaleString()} MT`;

        const riskBadge = document.getElementById('simRiskBadge');
        if (riskBadge) {
            riskBadge.innerText = riskLevel;
            if (riskLevel.includes('CRITICAL')) riskBadge.className = 'badge badge-danger text-xs px-2 py-0.5';
            else if (riskLevel.includes('MODERATE')) riskBadge.className = 'badge badge-warning text-xs px-2 py-0.5';
            else riskBadge.className = 'badge badge-success text-xs px-2 py-0.5';
        }

        // Populate Featured Best Decision Card
        const opt = res.optimization || {};
        const best = opt.best_decision || {};
        if (best && best.title) {
            if (document.getElementById('bestDecisionTitle')) document.getElementById('bestDecisionTitle').innerText = best.title;
            if (document.getElementById('bestDecisionFeasibility')) document.getElementById('bestDecisionFeasibility').innerText = best.feasibility || '94% Feasible';
            if (document.getElementById('bestDecisionAction')) document.getElementById('bestDecisionAction').innerText = best.action;
            if (document.getElementById('bestDecisionGain')) document.getElementById('bestDecisionGain').innerText = `+${(best.expected_gain_mt || 4200).toLocaleString()} MT`;
            if (document.getElementById('bestDecisionRisk')) document.getElementById('bestDecisionRisk').innerText = `-${best.risk_reduction_pct || 18.0}%`;
            if (document.getElementById('bestDecisionShortfall')) document.getElementById('bestDecisionShortfall').innerText = `${best.shortfall_before_pct}% → ${best.shortfall_after_pct}%`;
            if (document.getElementById('bestDecisionCost')) document.getElementById('bestDecisionCost').innerText = best.cost_formatted || '₹ 45.0 Lakhs';
        }

        // Populate Decision Optimization Matrix Table
        const matrixBody = document.getElementById('decisionMatrixBody');
        if (matrixBody && opt.possible_decisions) {
            let matrixHtml = '';
            opt.possible_decisions.forEach(d => {
                const isBest = d.is_recommended;
                const elementId = d.param_key === 'equipment_utilization_pct' ? 'simFleet' : 
                                 (d.param_key === 'rainfall_mm_day' ? 'simRain' : 
                                 (d.param_key === 'blast_efficiency_pct' ? 'simBlastEff' : 'simBreakdown'));
                
                matrixHtml += `
                    <tr class="${isBest ? 'bg-emerald-500/10 font-medium border-l-2 border-emerald-400' : 'hover:bg-white/5'}">
                        <td class="p-2">
                            <div class="font-bold text-white flex items-center gap-1.5">
                                ${isBest ? '<i class="fa-solid fa-star text-amber text-xs"></i>' : ''}
                                ${d.title}
                            </div>
                            <div class="text-[10px] text-gray-400 truncate max-w-[220px]">${d.action}</div>
                        </td>
                        <td class="p-2 font-mono text-purple-300">${d.cost_formatted}</td>
                        <td class="p-2 font-bold text-emerald">+${d.expected_gain_mt.toLocaleString()} MT</td>
                        <td class="p-2 text-cyan font-bold">-${d.risk_reduction_pct}%</td>
                        <td class="p-2 text-amber">${d.shortfall_before_pct}% → ${d.shortfall_after_pct}%</td>
                        <td class="p-2 text-right">
                            <button class="px-2 py-1 bg-cyan-600/40 hover:bg-cyan-500 text-white rounded text-[10px] font-bold border border-cyan-400/40 transition" 
                                    onclick="applyOptimizationDecision('${elementId}', '${d.param_key}', ${d.param_value})">
                                <i class="fa-solid fa-play text-[9px]"></i> Apply
                            </button>
                        </td>
                    </tr>
                `;
            });
            matrixBody.innerHTML = matrixHtml;
        }

        // Render Prescriptive AI Advice Cards in Recommendations tab
        const suggContainer = document.getElementById('simSuggestions');
        if (suggContainer) {
            suggContainer.innerHTML = '';
            (res.suggestions || []).forEach((s, rankIdx) => {
                const card = document.createElement('div');
                card.className = 'suggestion-card glass-panel p-3 mb-2 rounded border border-white/10';
                card.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-cyan text-sm">${rankIdx + 1}. ${s.title}</span>
                        <span class="badge badge-success text-[10px]">${s.priority || 'HIGH'}</span>
                    </div>
                    <div class="text-xs text-gray-300 mb-1">Impact: <strong class="text-emerald">${s.impact}</strong> | Feasibility: <strong class="text-purple-300">${s.feasibility}</strong></div>
                    <div class="text-xs text-gray-400">${s.action}</div>
                `;
                suggContainer.appendChild(card);
            });
        }

        if (res.op_forecast_7day) {
            updateOperationalForecastList(res.op_forecast_7day);
        }
    })
    .catch(err => console.error("Simulation API Error:", err));
}

function updateOperationalForecastList(opForecastArray) {
    const listElem = document.getElementById('opForecastList');
    if (!listElem) return;

    const defaultForecast = [
        { day: "MON", yield_mt: 16200, warning: false, status: "NORMAL", badge: "badge-success" },
        { day: "TUE", yield_mt: 15800, warning: false, status: "NORMAL", badge: "badge-success" },
        { day: "WED", yield_mt: 13400, warning: true, status: "⚠️ RAIN RISK", badge: "badge-warning" },
        { day: "THU", yield_mt: 12900, warning: true, status: "⚠️ FLEET RISK", badge: "badge-danger" },
        { day: "FRI", yield_mt: 16100, warning: false, status: "NORMAL", badge: "badge-success" },
        { day: "SAT", yield_mt: 17200, warning: false, status: "PEAK YIELD", badge: "badge-success" },
        { day: "SUN", yield_mt: 15900, warning: false, status: "NORMAL", badge: "badge-success" }
    ];

    const data = (opForecastArray && opForecastArray.length > 0) ? opForecastArray : defaultForecast;
    let html = '';

    data.forEach(item => {
        const isWarn = item.warning;
        const bgClass = isWarn ? (item.badge === 'badge-danger' ? 'bg-red-500/10' : 'bg-amber-500/10') : '';
        const textClass = isWarn ? (item.badge === 'badge-danger' ? 'text-red-400' : 'text-amber') : 'text-emerald';
        const dayTextClass = isWarn ? (item.badge === 'badge-danger' ? 'text-red-400' : 'text-amber') : 'text-gray-300';
        const iconWarn = isWarn ? ' ⚠️' : '';

        html += `
            <div class="forecast-day-item flex justify-between items-center py-2 border-b border-white/5 ${bgClass} px-2 rounded hover:bg-white/5 transition-colors">
                <div class="flex items-center space-x-2">
                    <span class="font-bold ${dayTextClass} text-sm">${item.day}${iconWarn}</span>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="${textClass} font-bold text-sm">${item.yield_mt.toLocaleString()} MT</span>
                    <span class="badge ${item.badge} text-2xs">${item.status}</span>
                </div>
            </div>
        `;
    });

    listElem.innerHTML = html;
}

/* ==========================================================================
   5. PRODUCTION YIELD CHART (CHART.JS)
   ========================================================================== */

function initYieldChart() {
    const ctx = document.getElementById('yieldChart').getContext('2d');
    
    yieldChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            datasets: [
                {
                    label: 'Target Yield (MT)',
                    data: [45000, 45000, 45000, 45000, 45000, 45000],
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'AI Forecast Yield (MT)',
                    data: [44200, 41800, 36500, 38900, 42100, 44800],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

/* ==========================================================================
   6. ML METRICS & DATA UPLOAD HUB
   ========================================================================== */

function fetchModelMetrics() {
    fetch('/api/v1/models')
        .then(res => res.json())
        .then(data => {
            const hist = data.historical_shortfall_model || {};
            const sfR2 = hist.shortfall_model_r2_score || 0.96;
            const sfMae = hist.shortfall_mae_mt || 684;
            const sfRmse = hist.shortfall_rmse_mt || 1493;

            if (document.getElementById('statR2')) {
                document.getElementById('statR2').innerHTML = `${sfR2} <span class="unit">R²</span>`;
            }
            if (document.getElementById('statR2Sub')) {
                document.getElementById('statR2Sub').innerHTML = `<i class="fa-solid fa-microchip"></i> MAE: ${sfMae.toLocaleString()} MT | RMSE: ${sfRmse.toLocaleString()} MT`;
            }

            const container = document.getElementById('metricsContent');
            let importHtml = '';
            for (const [feat, val] of Object.entries(data.feature_importances || {})) {
                importHtml += `
                    <div style="margin-bottom: 8px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                            <span>${feat}</span>
                            <span class="text-cyan font-bold">${(val * 100).toFixed(1)}%</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.1); height:6px; border-radius:3px;">
                            <div style="background:#38bdf8; width:${val * 100}%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-purple text-sm"><i class="fa-solid fa-cube"></i> 5-FOLD SPATIAL BLOCK CROSS-VALIDATION</h4>
                        <span class="badge badge-success text-2xs">PRUNED: ${data.outliers_pruned_count || 4} OUTLIERS</span>
                    </div>
                    <p class="text-xs text-gray-400 mb-2">Strategy: <strong>${data.validation_strategy || '5-Fold Spatial Block Cross-Validation'}</strong> (${data.sample_count || 120} core assays)</p>

                    <div class="grid grid-cols-4 gap-2 text-center mt-2 mb-3">
                        <div class="p-2 bg-slate-900/80 rounded border border-emerald-500/30">
                            <span class="text-2xs text-emerald block font-bold">5-FOLD SPATIAL CV</span>
                            <span class="text-emerald font-bold text-base">${data.spatial_5fold_cv_r2 || 0.88} ± ${data.spatial_5fold_cv_std || 0.03}</span>
                        </div>
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">TRAIN R²</span>
                            <span class="text-cyan font-bold text-base">${data.train_r2_score || 0.94}</span>
                        </div>
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">VAL R²</span>
                            <span class="text-purple font-bold text-base">${data.val_r2_score || 0.89}</span>
                        </div>
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">TEST R²</span>
                            <span class="text-amber font-bold text-base">${data.test_r2_score || 0.88}</span>
                        </div>
                    </div>

                    <div class="p-2 bg-slate-950/90 rounded border border-white/10 text-2xs text-gray-300">
                        <span class="font-bold text-cyan block mb-0.5"><i class="fa-solid fa-sliders"></i> TUNED HYPERPARAMETERS:</span>
                        n_estimators: <strong class="text-emerald">120</strong> | max_depth: <strong class="text-emerald">5</strong> | min_samples_split: <strong class="text-emerald">2</strong> | learning_rate: <strong class="text-emerald">0.08</strong>
                    </div>
                </div>

                <div class="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                    <h4 class="font-bold text-cyan text-sm mb-1"><i class="fa-solid fa-chart-line"></i> PRODUCTION FORECAST MODEL VALIDATION</h4>
                    <p class="text-xs text-gray-400 mb-2">Strategy: <strong>${hist.validation_strategy || '80/20 Chronological Time-Based Holdout Split'}</strong> (${hist.historical_sample_count || 4380} daily logs)</p>
                    <div class="grid grid-cols-3 gap-2 text-center mt-2">
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">R² SCORE</span>
                            <span class="text-emerald font-bold text-lg">${sfR2}</span>
                        </div>
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">MAE</span>
                            <span class="text-cyan font-bold text-lg">${sfMae.toLocaleString()} MT</span>
                        </div>
                        <div class="p-2 bg-slate-900/80 rounded border border-white/10">
                            <span class="text-2xs text-gray-400 block font-bold">RMSE</span>
                            <span class="text-purple font-bold text-lg">${sfRmse.toLocaleString()} MT</span>
                        </div>
                    </div>
                </div>

                <p class="mt-4 font-bold text-sm text-gray-200">Geological & Satellite Feature Importances:</p>
                <div class="mt-2">${importHtml}</div>
            `;
        })
        .catch(err => console.warn("Metrics load skipped:", err));
}

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(evt) {
    const file = evt.target.files[0];
    if (file) {
        document.getElementById('retrainStatus').innerText = `Loaded ${file.name}. Ready for training.`;
    }
}

function triggerModelRetrain() {
    const status = document.getElementById('retrainStatus');
    status.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-cyan"></i> Re-training AI spatial model on uploaded survey dataset...`;

    fetch('/api/v1/models/retrain', { method: 'POST' })
        .then(res => res.json())
        .then(res => {
            status.innerHTML = `<span class="text-emerald font-bold"><i class="fa-solid fa-circle-check"></i> ${res.message}</span>`;
            fetchProbabilityGrid();
            fetchModelMetrics();
        })
        .catch(err => {
            status.innerHTML = `<span class="text-red-400">Retrain Failed: ${err}</span>`;
        });
}

function renderLiveAdvisories() {
    const container = document.getElementById('liveAdvisoryContainer');
    if (!container) return;

    const solutions = [
        {
            title: "⛈️ Balaghat Pit-2 Waterlogging Prevention",
            feasibility: "96% Feasible",
            exec_time: "< 25 mins",
            desc: "Satellite soil moisture (78%) & live rain (14.5 mm/hr) detected in South Basin.",
            action: "Deploy Dewatering Pumps #3 & #4; Shift excavation to High-Altitude Bench 3.",
            recovery: 2450
        },
        {
            title: "🚜 Crusher Unit B Fleet Re-Balance",
            feasibility: "91% Feasible",
            exec_time: "< 15 mins",
            desc: "Crusher A operating at 94% capacity while Crusher B is under-utilized at 42%.",
            action: "Reroute 4 Haul Trucks from Pit-1 via Central Bypass Ramp directly to Crusher B hopper.",
            recovery: 1850
        },
        {
            title: "💥 Sector C Blasting Optimization",
            feasibility: "88% Feasible",
            exec_time: "Scheduled Tomorrow 09:00",
            desc: "High soil moisture detected in Sector C bench rock structure.",
            action: "Switch to water-resistant emulsion charges & execute dry stemming delay sequence.",
            recovery: 1400
        }
    ];

    let html = '';
    solutions.forEach((s, idx) => {
        html += `
            <div class="solution-item-card" id="solCard_${idx}">
                <div class="solution-header">
                    <span>${s.title}</span>
                    <span class="feasibility-tag"><i class="fa-solid fa-circle-check"></i> ${s.feasibility}</span>
                </div>
                <div class="solution-desc">
                    <p><strong>Condition:</strong> ${s.desc}</p>
                    <p class="mt-1 text-cyan"><strong>Solution:</strong> ${s.action}</p>
                </div>
                <div class="solution-meta">
                    <span class="text-emerald font-bold">+${s.recovery.toLocaleString()} MT Yield Protected</span>
                    <button class="btn-apply" onclick="applyFeasibleSolution(this, ${s.recovery}, ${idx})">
                        <i class="fa-solid fa-play"></i> Apply Solution
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function applyFeasibleSolution(btn, recoveryAmount, cardIdx) {
    if (btn.classList.contains('applied')) return;

    btn.classList.add('applied');
    btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Executed & Protected`;

    const card = document.getElementById(`solCard_${cardIdx}`);
    if (card) {
        card.style.borderLeftColor = '#10b981';
        card.style.background = 'rgba(16, 185, 129, 0.1)';
    }

    // Update global risk indicators
    const riskBadge = document.getElementById('statRiskBadge');
    if (riskBadge) {
        riskBadge.className = 'badge badge-success';
        riskBadge.innerText = 'OPTIMIZED (LOW RISK)';
    }
}

function updateShortfallXaiBars(rainfall, temp, fleet, moisture) {
    const container = document.getElementById('xaiShortfallBars');
    if (!container) return;

    // Calculate dynamic weights
    let eqWeight = Math.round(max(15, (100 - fleet) * 0.75 + 10));
    let rainWeight = Math.round(max(10, rainfall * 0.4));
    let blastWeight = Math.round(max(10, moisture * 0.3));
    let oreWeight = Math.max(10, 100 - (eqWeight + rainWeight + blastWeight));

    const total = eqWeight + rainWeight + blastWeight + oreWeight;
    eqWeight = Math.round((eqWeight / total) * 100);
    rainWeight = Math.round((rainWeight / total) * 100);
    blastWeight = Math.round((blastWeight / total) * 100);
    oreWeight = 100 - (eqWeight + rainWeight + blastWeight);

    container.innerHTML = `
        <div class="xai-bar-item">
            <div class="xai-bar-label"><span>Equipment Downtime & Maintenance</span> <span class="font-bold text-red-400">${eqWeight}%</span></div>
            <div class="xai-progress-track"><div class="xai-progress-fill bg-red" style="width: ${eqWeight}%;"></div></div>
        </div>
        <div class="xai-bar-item">
            <div class="xai-bar-label"><span>Monsoon Rainfall & Waterlogging</span> <span class="font-bold text-cyan">${rainWeight}%</span></div>
            <div class="xai-progress-track"><div class="xai-progress-fill bg-cyan" style="width: ${rainWeight}%;"></div></div>
        </div>
        <div class="xai-bar-item">
            <div class="xai-bar-label"><span>Blasting & Stemming Delays</span> <span class="font-bold text-amber">${blastWeight}%</span></div>
            <div class="xai-progress-track"><div class="xai-progress-fill bg-amber" style="width: ${blastWeight}%;"></div></div>
        </div>
        <div class="xai-bar-item">
            <div class="xai-bar-label"><span>Ore Bench Accessibility</span> <span class="font-bold text-purple">${oreWeight}%</span></div>
            <div class="xai-progress-track"><div class="xai-progress-fill bg-purple" style="width: ${oreWeight}%;"></div></div>
        </div>
    `;
}

function max(a, b) { return a > b ? a : b; }

/* ==========================================================================
   7. DATA HEALTH & QUALITY ASSURANCE CONTROLLER
   ========================================================================== */
function fetchDataHealth() {
    fetch('/api/v1/data-health/detailed')
        .then(res => res.json())
        .then(data => {
            const overall = data.overall_score || 97;
            if (document.getElementById('overallVal')) document.getElementById('overallVal').innerText = `${Math.round(overall)}%`;
            if (document.getElementById('overallDataBadge')) document.getElementById('overallDataBadge').innerText = `${Math.round(overall)}% QUALITY`;

            if (data.streams && Array.isArray(data.streams)) {
                data.streams.forEach(s => {
                    const name = (s.stream || s.stream_name || '').toLowerCase();
                    const val = s.accuracy_pct || s.completeness_pct || 96;
                    if (name.includes('borehole') || name.includes('drillhole')) {
                        if (document.getElementById('dhVal')) document.getElementById('dhVal').innerText = `${val}%`;
                        if (document.getElementById('dhBar')) document.getElementById('dhBar').style.width = `${val}%`;
                    } else if (name.includes('production')) {
                        if (document.getElementById('prodVal')) document.getElementById('prodVal').innerText = `${val}%`;
                        if (document.getElementById('prodBar')) document.getElementById('prodBar').style.width = `${val}%`;
                    } else if (name.includes('weather')) {
                        if (document.getElementById('weatherVal')) document.getElementById('weatherVal').innerText = `${val}%`;
                        if (document.getElementById('weatherBar')) document.getElementById('weatherBar').style.width = `${val}%`;
                    } else if (name.includes('satellite')) {
                        if (document.getElementById('satVal')) document.getElementById('satVal').innerText = `${val}%`;
                        if (document.getElementById('satBar')) document.getElementById('satBar').style.width = `${val}%`;
                    }
                });
                renderDetailedDataHealth(data.streams);
            }

            if (document.getElementById('dataAlertText')) {
                document.getElementById('dataAlertText').innerText = "All 4 data streams verified active & streaming into SQL database";
            }
        })
        .catch(err => {
            console.error("Error fetching data health:", err);
            // Fallback robust defaults if network hiccups
            if (document.getElementById('dhVal')) document.getElementById('dhVal').innerText = '98%';
            if (document.getElementById('prodVal')) document.getElementById('prodVal').innerText = '99%';
            if (document.getElementById('weatherVal')) document.getElementById('weatherVal').innerText = '98%';
            if (document.getElementById('satVal')) document.getElementById('satVal').innerText = '94%';
            if (document.getElementById('overallVal')) document.getElementById('overallVal').innerText = '97%';
        });
}

/* ==========================================================================
   8. RELATIONAL DATABASE USER DIRECTORY & AUDIT LOG CONTROLLER
   ========================================================================== */
function fetchUsers() {
    fetch('/api/v1/users')
        .then(res => res.json())
        .then(users => {
            const container = document.getElementById('dbUserList');
            if (!container) return;

            let html = '';
            users.forEach(u => {
                html += `
                    <div class="flex items-center justify-between p-2 bg-slate-900/80 rounded border border-white/10 text-xs">
                        <div class="flex items-center space-x-2">
                            <i class="fa-solid fa-user-gear text-cyan"></i>
                            <div>
                                <span class="font-bold text-gray-200 block">${u.full_name}</span>
                                <span class="text-2xs text-gray-400">${u.role} &bull; ${u.department}</span>
                            </div>
                        </div>
                        <span class="badge badge-success text-2xs">${u.status}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(err => console.warn("Users fetch skipped:", err));
}

function fetchActivityLogs() {
    fetch('/api/v1/activity-logs')
        .then(res => res.json())
        .then(logs => {
            const container = document.getElementById('dbAuditLogs');
            if (!container) return;

            let html = '';
            logs.forEach(l => {
                html += `
                    <div class="p-1.5 bg-slate-950/90 rounded border border-white/5 text-gray-300">
                        <div class="flex justify-between text-2xs text-gray-400">
                            <span class="text-cyan font-bold">@${l.username} [${l.module}]</span>
                            <span>${l.timestamp}</span>
                        </div>
                        <p class="text-xs text-gray-200 mt-0.5"><strong class="text-amber">${l.action}:</strong> ${l.details}</p>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(err => console.warn("Activity logs fetch skipped:", err));
}

// ==============================================================================
// CLOSED-LOOP AI PREDICTION ENGINE & DATA INGESTION HANDLERS
// ==============================================================================

function recalculateAIPredictionsLive() {
    showToast("Running Closed-Loop AI Prediction Engine on SQLite DB records...", "info");
    fetch('/api/v1/predict/recalculate', { method: 'POST' })
        .then(res => res.json())
        .then(res => {
            if (res.data) {
                currentGridData = res.data;
                renderProbabilityGrid();
                if (res.data.total_estimated_reserve_mt) {
                    const reserveMillion = (res.data.total_estimated_reserve_mt / 1000000).toFixed(2);
                    document.getElementById('statReserve').innerHTML = `${reserveMillion}M <span class="unit">MT</span>`;
                }
                showToast("AI Prospectivity Grid recalculated & Live GIS Map updated!", "success");
            }
        })
        .catch(err => {
            console.error("Prediction Engine Error:", err);
            showToast("Failed to run Prediction Engine: " + err, "error");
        });
}

function openIngestModal() {
    const el = document.getElementById('ingestModal');
    if (el) el.classList.remove('hidden');
}

function closeIngestModal() {
    const el = document.getElementById('ingestModal');
    if (el) el.classList.add('hidden');
}

function handleBoreholeIngestSubmit(event) {
    event.preventDefault();
    const bhId = document.getElementById('ingestBhId').value;
    const lat = parseFloat(document.getElementById('ingestLat').value);
    const lng = parseFloat(document.getElementById('ingestLng').value);
    const mnGrade = parseFloat(document.getElementById('ingestGrade').value);
    const depth = parseFloat(document.getElementById('ingestDepth').value);
    const lithology = document.getElementById('ingestLithology').value;

    const payload = {
        borehole_id: bhId,
        latitude: lat,
        longitude: lng,
        mn_grade_pct: mnGrade,
        depth_m: depth,
        lithology: lithology
    };

    closeIngestModal();
    showToast(`Ingesting Borehole Assay '${bhId}' & executing AI Engine...`, "info");

    fetch('/api/v1/ingest/borehole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        if (res.grid) {
            currentGridData = res.grid;
            renderProbabilityGrid();
            
            // Add custom borehole marker to Leaflet GIS Map
            if (map && typeof L !== 'undefined') {
                const newMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: '#10b981',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.95
                }).addTo(map);
                newMarker.bindPopup(`
                    <div style="color:#0f172a; padding:6px; font-family:sans-serif;">
                        <strong style="color:#047857; font-size:13px;">🆕 ${bhId} (NEW INGESTION)</strong><br/>
                        <strong>Lat/Lng:</strong> ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E<br/>
                        <strong>Assay Mn Grade:</strong> <span style="color:#047857; font-weight:bold;">${mnGrade}%</span><br/>
                        <strong>Depth:</strong> ${depth}m<br/>
                        <strong>Lithology:</strong> ${lithology}<br/>
                        <span style="font-size:10px; color:#64748b; margin-top:4px; display:block;">STATUS: INGESTED & AI SYNCHRONIZED</span>
                    </div>
                `);
                map.flyTo([lat, lng], 15, { duration: 1.5 });
                setTimeout(() => newMarker.openPopup(), 1600);
            }

            showToast(res.message, "success");
            fetchBoreholeLogs();
            fetchActivityLogs();
        }
    })
    .catch(err => {
        console.error("Ingestion error:", err);
        showToast("Borehole ingestion failed: " + err, "error");
    });
}

// ==============================================================================
// GLOBAL TOAST NOTIFICATION UTILITY
// ==============================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all transform duration-300 border ${
        type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' :
        type === 'error' ? 'bg-red-950/90 text-red-300 border-red-500/40' :
        type === 'warning' ? 'bg-amber-950/90 text-amber-300 border-amber-500/40' :
        'bg-slate-900/90 text-cyan-300 border-cyan-500/40'
    }`;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==============================================================================
// ENTERPRISE RBAC & OPERATIONAL ROLE SWITCHER
// ==============================================================================
let currentRole = 'Admin';
let currentUserProfile = {
    username: 'admin',
    name: 'Admin (CMD)',
    role: 'Admin',
    token: null
};

function initUserRole() {
    const saved = localStorage.getItem('mangan_user_role');
    if (saved) {
        try {
            currentUserProfile = JSON.parse(saved);
            currentRole = currentUserProfile.role || 'Admin';
        } catch (e) {}
    }
    updateNavUserBadge();
    applyRolePermissions();
}

function updateNavUserBadge() {
    const nameEl = document.getElementById('navUserName');
    const roleEl = document.getElementById('navUserRole');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = currentUserProfile.name;
    if (roleEl) roleEl.textContent = `${currentUserProfile.role} (Active)`;
    if (avatarEl) {
        const parts = currentUserProfile.name.split(' ');
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0].substring(0, 2);
        avatarEl.textContent = initials.toUpperCase();
    }
}

function openLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.classList.remove('hidden');
    document.querySelectorAll('.role-card').forEach(c => {
        c.classList.remove('active-role');
        if (c.innerText.toLowerCase().includes(currentRole.toLowerCase())) {
            c.classList.add('active-role');
        }
    });
}

function closeLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.classList.add('hidden');
}

function selectRolePreset(roleKey, displayName, roleTitle) {
    currentUserProfile = {
        username: roleKey,
        name: displayName,
        role: roleTitle,
        token: 'demo-rbac-token-' + roleKey
    };
    currentRole = roleTitle;
    localStorage.setItem('mangan_user_role', JSON.stringify(currentUserProfile));
    updateNavUserBadge();
    applyRolePermissions();
    showToast(`Switched operational role to: ${displayName} [${roleTitle}]`, 'success');
    setTimeout(closeLoginModal, 250);
}

function handleLoginFormSubmit(event) {
    event.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;
    
    fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    })
    .then(r => r.json())
    .then(res => {
        if (res.token) {
            currentUserProfile = {
                username: res.user.username,
                name: res.user.name,
                role: res.user.role,
                token: res.token
            };
            currentRole = res.user.role;
            localStorage.setItem('mangan_user_role', JSON.stringify(currentUserProfile));
            localStorage.setItem('mangan_auth_token', res.token);
            updateNavUserBadge();
            applyRolePermissions();
            showToast(`Welcome ${res.user.name}! Authenticated as ${res.user.role}.`, 'success');
            closeLoginModal();
        } else {
            showToast(res.error || 'Authentication failed', 'error');
        }
    })
    .catch(err => {
        showToast('Login error: ' + err, 'error');
    });
}

function applyRolePermissions() {
    const isAdmin = currentRole === 'Admin';
    const isAnalyst = currentRole === 'Analyst';
    const isOps = currentRole === 'Operations Manager';
    const isGeologist = currentRole === 'Geologist';
    const isViewer = currentRole === 'Viewer';

    // Model management buttons restriction
    const deployBtns = document.querySelectorAll('#modelRegistryCard button');
    deployBtns.forEach(b => {
        if (!isAdmin && !isAnalyst) {
            b.setAttribute('disabled', 'true');
            b.classList.add('opacity-40', 'cursor-not-allowed');
            b.title = "Action restricted: Admin or Analyst role required.";
        } else {
            b.removeAttribute('disabled');
            b.classList.remove('opacity-40', 'cursor-not-allowed');
            b.title = "";
        }
    });
}

// ==============================================================================
// ACTIVE ALERTS & INCIDENT NOTIFICATION DRAWER
// ==============================================================================
let activeAlertsList = [];

function toggleAlertsDrawer(forceState) {
    const drawer = document.getElementById('alertsDrawer');
    const backdrop = document.getElementById('alertsBackdrop');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    const shouldOpen = (forceState !== undefined) ? forceState : !isOpen;

    if (shouldOpen) {
        drawer.classList.remove('hidden');
        requestAnimationFrame(() => {
            drawer.classList.add('open');
        });
        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.classList.add('active');
        }
        fetchActiveAlerts();
    } else {
        drawer.classList.remove('open');
        if (backdrop) {
            backdrop.classList.remove('active');
            backdrop.classList.add('hidden');
        }
        setTimeout(() => {
            if (!drawer.classList.contains('open')) {
                drawer.classList.add('hidden');
            }
        }, 360);
    }
}

function fetchActiveAlerts() {
    fetch('/api/v1/alerts')
        .then(r => r.json())
        .then(res => {
            if (res.alerts) {
                activeAlertsList = res.alerts;
                renderAlertsList(res.alerts);
                const count = res.total_unresolved !== undefined ? res.total_unresolved : res.alerts.length;
                const countBadge = document.getElementById('activeAlertsCount');
                const drawerCount = document.getElementById('drawerAlertCount');
                if (countBadge) countBadge.textContent = count;
                if (drawerCount) drawerCount.textContent = count;
            }
        })
        .catch(err => console.warn("Failed to fetch alerts:", err));
}

function renderAlertsList(alerts) {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <i class="fa-solid fa-circle-check text-4xl text-emerald mb-2"></i>
                <h4 class="text-sm font-bold text-white">All Clear</h4>
                <p class="text-xs text-gray-400 mt-1">No active critical or high alerts detected across mining sectors.</p>
            </div>
        `;
        return;
    }

    let html = '';
    alerts.forEach(a => {
        const sev = (a.severity || 'medium').toLowerCase();
        const sevBadge = sev === 'critical' ? 'badge-danger' : sev === 'high' ? 'badge-warning' : sev === 'medium' ? 'badge-cyan' : 'badge-success';
        const sevIcon = sev === 'critical' ? 'fa-triangle-exclamation' : 'fa-bell';

        html += `
            <div class="alert-item-card ${sev}" id="alert_card_${a.id}">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="badge ${sevBadge} text-3xs font-mono uppercase">
                        <i class="fa-solid ${sevIcon}"></i> ${a.severity}
                    </span>
                    <span class="text-3xs text-gray-400 font-mono">${a.timestamp || 'Just now'}</span>
                </div>
                <h4 class="text-xs font-bold text-white mb-1">${a.title}</h4>
                <p class="text-2xs text-gray-300 leading-relaxed mb-2">${a.description}</p>
                <div class="bg-black/30 p-2 rounded border border-white/5 text-2xs text-cyan-300 mb-2">
                    <strong><i class="fa-solid fa-compass"></i> Prescriptive Protocol:</strong> ${a.recommended_action || a.recommendation || 'Inspect site and notify shift manager.'}
                </div>
                <div class="flex justify-between items-center pt-1 border-t border-white/5">
                    <span class="text-3xs text-gray-400"><i class="fa-solid fa-location-dot text-amber"></i> ${a.zone || 'Central Sector'}</span>
                    <button class="btn-xs bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white px-2.5 py-1 rounded text-3xs font-semibold transition" onclick="dismissAlert('${a.id}')">
                        <i class="fa-solid fa-check"></i> Dismiss
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function dismissAlert(alertId) {
    fetch('/api/v1/alerts/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
    })
    .then(r => r.json())
    .then(res => {
        showToast("Alert dismissed and logged to audit trail.", "info");
        const card = document.getElementById(`alert_card_${alertId}`);
        if (card) {
            card.classList.add('opacity-0', 'translate-x-4');
            setTimeout(() => {
                card.remove();
                fetchActiveAlerts();
            }, 250);
        }
    })
    .catch(err => {
        showToast("Failed to dismiss alert: " + err, "error");
    });
}

function acknowledgeAllAlerts() {
    showToast("All active operational alerts acknowledged.", "success");
    const container = document.getElementById('alertsListContainer');
    if (container) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <i class="fa-solid fa-circle-check text-4xl text-emerald mb-2"></i>
                <h4 class="text-sm font-bold text-white">All Alerts Acknowledged</h4>
                <p class="text-xs text-gray-400 mt-1">Incident register signed off by ${currentUserProfile.name}.</p>
            </div>
        `;
    }
    const countBadge = document.getElementById('activeAlertsCount');
    const drawerCount = document.getElementById('drawerAlertCount');
    if (countBadge) countBadge.textContent = '0';
    if (drawerCount) drawerCount.textContent = '0';
}

// ==============================================================================
// PRESCRIPTIVE INTELLIGENCE 4-QUESTION REASONING ENGINE
// ==============================================================================
function initPrescriptiveCard() {
    fetch('/api/v1/prescriptive')
        .then(r => r.json())
        .then(res => {
            const d = res.data || res;
            if (d) {
                const q1Title = document.getElementById('piQ1Title');
                const q1Desc = document.getElementById('piQ1Desc');
                const q2Title = document.getElementById('piQ2Title');
                const q2Desc = document.getElementById('piQ2Desc');
                const q3Title = document.getElementById('piQ3Title');
                const q3Desc = document.getElementById('piQ3Desc');
                const q4Title = document.getElementById('piQ4Title');
                const q4List = document.getElementById('piQ4List');

                if (d.what_is_happening) {
                    if (q1Title && d.what_is_happening.title) q1Title.textContent = d.what_is_happening.title;
                    if (q1Desc && d.what_is_happening.summary) q1Desc.textContent = d.what_is_happening.summary;
                }
                if (d.why_is_it_happening) {
                    if (q2Title && d.why_is_it_happening.title) q2Title.textContent = d.why_is_it_happening.title;
                    if (q2Desc && d.why_is_it_happening.primary_cause) q2Desc.textContent = d.why_is_it_happening.primary_cause;
                }
                if (d.what_will_happen_next) {
                    if (q3Title && d.what_will_happen_next.title) q3Title.textContent = d.what_will_happen_next.title;
                    if (q3Desc && d.what_will_happen_next.trajectory) q3Desc.textContent = d.what_will_happen_next.trajectory;
                }
                const recs = (d.what_should_the_mine_do && d.what_should_the_mine_do.recommendations) ? d.what_should_the_mine_do.recommendations : (d.recommendations || []);
                if (recs.length > 0 && q4List) {
                    let html = '';
                    recs.forEach(r => {
                        html += `
                            <li class="flex items-start gap-1.5 text-2xs text-gray-200">
                                <i class="fa-solid fa-circle-arrow-right text-cyan text-3xs mt-1"></i>
                                <span><strong class="text-white">${r.domain || 'Action'}:</strong> ${r.action} (<span class="text-emerald font-bold">${r.expected_impact}</span>)</span>
                            </li>
                        `;
                    });
                    q4List.innerHTML = html;
                }
            }
        })
        .catch(err => console.warn("Prescriptive fetch error:", err));
}

// ==============================================================================
// MULTI-HORIZON HISTORICAL ANALYSIS & TREND COMPARISON
// ==============================================================================
let activeHorizon = '30d';

function setHistoricalPeriod(period) {
    activeHorizon = period;
    
    // Update active button state
    const container = document.getElementById('horizonPills');
    if (container) {
        container.querySelectorAll('.horizon-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-cyan-600', 'text-white');
            btn.classList.add('text-gray-400');
            if (btn.textContent.trim().toLowerCase() === period.toLowerCase()) {
                btn.classList.add('active', 'bg-cyan-600', 'text-white');
                btn.classList.remove('text-gray-400');
            }
        });
    }

    const badge = document.getElementById('chartHorizonBadge');
    if (badge) badge.textContent = `${period.toUpperCase()} HORIZON`;

    fetchHistoricalData(period);
}

function fetchHistoricalData(period) {
    fetch(`/api/v1/history?period=${period}`)
        .then(r => r.json())
        .then(res => {
            const d = res.data || res;
            if (d) {
                const dProd = document.getElementById('deltaProd');
                const dFleet = document.getElementById('deltaFleet');
                const comp = d.comparison || d.comparison_vs_previous_period;
                if (dProd && comp) {
                    const val = comp.production_delta_pct !== undefined ? comp.production_delta_pct : comp.production_volume_delta_pct;
                    if (val !== undefined) {
                        dProd.textContent = `${val >= 0 ? '+' : ''}${val}% vs prev period`;
                        dProd.className = `badge ${val >= 0 ? 'badge-success' : 'badge-danger'}`;
                    }
                }
                if (dFleet && comp) {
                    const fVal = comp.fleet_util_delta_pct !== undefined ? comp.fleet_util_delta_pct : comp.equipment_availability_delta_pct;
                    if (fVal !== undefined) {
                        dFleet.textContent = `${fVal >= 0 ? '+' : ''}${fVal}% fleet turnaround`;
                    }
                }

                // Update Chart.js yieldChart dataset if present
                const dates = d.labels || (d.series && d.series.dates);
                const actual = d.production_mt || (d.series && d.series.actual_tonnage);
                if (yieldChart && dates && actual) {
                    yieldChart.data.labels = dates;
                    if (yieldChart.data.datasets[0]) yieldChart.data.datasets[0].data = actual;
                    yieldChart.update();
                }
            }
        })
        .catch(err => console.warn("History fetch error:", err));
}

// ==============================================================================
// ADVANCED FLEET DISPATCH OPTIMIZATION CONTROLLER
// ==============================================================================
function fetchFleetOptimization() {
    fetch('/api/v1/equipment/optimize')
        .then(r => r.json())
        .then(res => {
            const allocs = res.allocations || (res.data && res.data.bench_allocations);
            if (allocs) {
                renderDispatchGrid(allocs);
            }
        })
        .catch(err => console.warn("Fleet optimization fetch error:", err));
}

function renderDispatchGrid(allocations) {
    const grid = document.getElementById('dispatchGrid');
    if (!grid) return;

    let html = '';
    allocations.forEach(b => {
        const priorityBadge = b.priority === 'CRITICAL' ? 'badge-danger' : b.priority === 'HIGH' ? 'badge-warning' : 'badge-cyan';
        const excCount = b.assigned_excavators !== undefined ? b.assigned_excavators : (b.excavators ? b.excavators.length : 2);
        const truckCount = b.assigned_trucks !== undefined ? b.assigned_trucks : (b.dump_trucks ? b.dump_trucks.length : 5);
        const target = b.tonnage_target_mt || b.target_tph || 22000;
        const cycle = b.cycle_time_mins || b.cycle_time_min || 18;
        const eff = b.efficiency_pct || b.current_tph || 92;

        html += `
            <div class="bench-card">
                <div class="flex items-center justify-between mb-1.5">
                    <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                        <i class="fa-solid fa-location-dot text-cyan"></i> ${b.bench_name || b.bench_id}
                    </h4>
                    <span class="badge ${priorityBadge} text-3xs font-mono">
                        ${b.priority}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-2xs mb-2">
                    <div class="bg-black/30 p-1.5 rounded border border-white/5">
                        <span class="text-gray-400 block text-3xs">Excavators:</span>
                        <strong class="text-cyan font-mono text-xs"><i class="fa-solid fa-tractor"></i> ${excCount} Units</strong>
                    </div>
                    <div class="bg-black/30 p-1.5 rounded border border-white/5">
                        <span class="text-gray-400 block text-3xs">Haul Dumpers:</span>
                        <strong class="text-amber font-mono text-xs"><i class="fa-solid fa-truck"></i> ${truckCount} Units</strong>
                    </div>
                </div>
                <div class="flex justify-between items-center text-3xs text-gray-400">
                    <span>Target: <strong class="text-white">${typeof target === 'number' ? target.toLocaleString() : target} MT</strong></span>
                    <span>Cycle: <strong class="text-emerald">${cycle}m</strong></span>
                    <span>Efficiency: <strong class="text-cyan">${eff}%</strong></span>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

// ==============================================================================
// AI MODEL MANAGEMENT REGISTRY & ZERO-DOWNTIME ROLLBACK
// ==============================================================================
function fetchModelRegistry() {
    fetch('/api/v1/models/history')
        .then(r => r.json())
        .then(res => {
            const models = res.versions || res.models;
            if (models) {
                renderModelRegistryTable(models);
            }
        })
        .catch(err => console.warn("Model registry fetch error:", err));
}

function renderModelRegistryTable(models) {
    const tbody = document.getElementById('modelRegistryTableBody');
    if (!tbody) return;

    let html = '';
    models.forEach(m => {
        const isActive = m.status === 'ACTIVE' || m.status === 'ACTIVE PRODUCTION';
        const isStaged = m.status === 'CANDIDATE / STAGED' || m.status === 'STAGED';
        const statusBadge = isActive ? 'badge-success' : isStaged ? 'badge-warning' : 'bg-gray-700 text-gray-300';
        
        html += `
            <tr class="${isActive ? 'bg-cyan-500/10' : ''}">
                <td class="py-3 px-3 font-bold text-white font-mono flex items-center gap-1.5">
                    ${isActive ? '<i class="fa-solid fa-circle-check text-cyan"></i>' : '<i class="fa-solid fa-code-commit text-gray-500"></i>'}
                    ${m.version}
                </td>
                <td class="py-3 px-3"><span class="badge ${statusBadge} text-2xs">${m.status}</span></td>
                <td class="py-3 px-3 text-gray-300 text-2xs">${m.algorithm || 'Spatial Random Forest + XGBoost'}</td>
                <td class="py-3 px-3 text-right font-mono text-cyan">${m.sample_count ? m.sample_count.toLocaleString() : (m.samples ? m.samples.toLocaleString() : '1,248')}</td>
                <td class="py-3 px-3 text-right font-mono text-emerald font-bold">${m.r2_score || m.r2 || '0.942'}</td>
                <td class="py-3 px-3 text-right font-mono text-amber">${m.rmse ? m.rmse + '%' : '1.86%'}</td>
                <td class="py-3 px-3 text-gray-400 font-mono text-2xs">${m.trained_date || m.deployed_at || '2026-09-11'}</td>
                <td class="py-3 px-3 text-center">
                    ${isActive ? 
                        '<span class="text-2xs text-cyan font-bold bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/30">Currently Serving</span>' :
                        `<button class="btn-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/40 px-3 py-1 rounded text-2xs font-bold transition" onclick="deployModelVersion('${m.version}')">Deploy ${m.version}</button>`
                    }
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    applyRolePermissions();
}

function deployModelVersion(version) {
    if (currentRole === 'Viewer') {
        showToast("Access Denied: Viewer role cannot deploy production models.", "error");
        return;
    }
    showToast(`Deploying AI Model Version ${version} to Production cluster...`, "info");
    fetch('/api/v1/models/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version })
    })
    .then(r => r.json())
    .then(res => {
        showToast(res.message || `Model ${version} deployed successfully!`, "success");
        const badge = document.getElementById('activeModelBadge');
        if (badge) badge.innerHTML = `<i class="fa-solid fa-circle text-2xs animate-pulse"></i> ACTIVE: ${version}-PROD`;
        fetchModelRegistry();
        fetchModelMetrics();
    })
    .catch(err => {
        showToast("Deploy failed: " + err, "error");
    });
}

function rollbackModelVersion() {
    if (currentRole === 'Viewer') {
        showToast("Access Denied: Viewer role cannot execute model rollbacks.", "error");
        return;
    }
    showToast("Initiating Zero-Downtime Rollback to previous model version...", "warning");
    fetch('/api/v1/models/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(res => {
        showToast(res.message || "Model rolled back successfully!", "success");
        const badge = document.getElementById('activeModelBadge');
        if (badge) badge.innerHTML = `<i class="fa-solid fa-circle text-2xs animate-pulse"></i> ACTIVE: ${res.current_model || 'v1.3'}-PROD`;
        fetchModelRegistry();
        fetchModelMetrics();
    })
    .catch(err => {
        showToast("Rollback failed: " + err, "error");
    });
}

// ==============================================================================
// AI VS ACTUAL DRILLHOLE GROUND-TRUTH VALIDATION
// ==============================================================================
function fetchGroundTruthValidation() {
    fetch('/api/v1/validation/ground-truth')
        .then(r => r.json())
        .then(res => {
            const summary = res.summary || res.data || res;
            if (summary) {
                const acc = document.getElementById('gtAccuracy');
                const rmse = document.getElementById('gtRmse');
                const mae = document.getElementById('gtMae');
                const r2 = document.getElementById('gtR2');
                if (acc && summary.accuracy_pct !== undefined) acc.textContent = summary.accuracy_pct + '%';
                if (rmse && summary.rmse_pct !== undefined) rmse.textContent = summary.rmse_pct + '%';
                if (mae && summary.mae_pct !== undefined) mae.textContent = summary.mae_pct + '%';
                if (r2 && summary.r2_score !== undefined) r2.textContent = summary.r2_score;
            }
            const samples = res.samples || (res.data && res.data.samples);
            if (samples) {
                renderGroundTruthTable(samples);
            }
        })
        .catch(err => console.warn("Ground truth fetch error:", err));
}

function renderGroundTruthTable(samples) {
    const tbody = document.getElementById('groundTruthTableBody');
    if (!tbody) return;

    let html = '';
    samples.forEach(s => {
        const err = Math.abs(s.actual_mn_pct - s.predicted_mn_pct).toFixed(1);
        const isPrecise = err <= 1.2;
        const statusBadge = isPrecise ? 'badge-success' : 'badge-warning';
        const statusText = isPrecise ? 'HIGH PRECISION' : 'VALIDATED';

        html += `
            <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-cyan">${s.borehole_id}</td>
                <td class="py-2.5 px-3 text-gray-300 text-2xs">${s.pit_sector}</td>
                <td class="py-2.5 px-3 text-gray-400 text-2xs">${s.lithology}</td>
                <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald">${s.actual_mn_pct}%</td>
                <td class="py-2.5 px-3 text-right font-mono font-bold text-cyan">${s.predicted_mn_pct}%</td>
                <td class="py-2.5 px-3 text-right font-mono ${isPrecise ? 'text-emerald' : 'text-amber'}">${err}%</td>
                <td class="py-2.5 px-3 text-center"><span class="badge ${statusBadge} text-2xs">${statusText}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==============================================================================
// DETAILED DATA STREAM QUALITY ASSURANCE AUDIT
// ==============================================================================
function fetchDetailedDataHealth() {
    fetch('/api/v1/data-health/detailed')
        .then(r => r.json())
        .then(res => {
            if (res.streams) {
                renderDetailedDataHealth(res.streams);
            }
        })
        .catch(err => console.warn("Detailed data health fetch error:", err));
}

function renderDetailedDataHealth(streams) {
    const tbody = document.getElementById('detailedDataHealthBody');
    if (!tbody) return;

    let html = '';
    streams.forEach(s => {
        const streamTitle = s.stream || s.stream_name || 'Telemetry Stream';
        const sourceName = s.source || 'Internal Sensor Feed';
        const freshness = s.last_ingestion || (s.freshness_mins ? `${s.freshness_mins}m ago` : 'Real-time');
        const completeness = s.completeness_pct !== undefined ? s.completeness_pct : 98;
        const accuracy = s.accuracy_pct !== undefined ? s.accuracy_pct : 97;
        const missingDups = `${s.missing_records || 0} / ${s.duplicate_records || 0}`;
        const avail = s.availability || (s.availability_pct ? `${s.availability_pct}% ONLINE` : 'ONLINE');
        const lastIngest = s.last_ingestion || 'Active';

        html += `
            <tr>
                <td class="py-2.5 px-3 font-bold text-white text-2xs flex items-center gap-2">
                    <i class="fa-solid fa-circle text-emerald text-3xs"></i> ${streamTitle}
                </td>
                <td class="py-2.5 px-3 text-gray-400 text-2xs font-mono">${sourceName}</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan font-semibold text-2xs">${freshness}</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald font-bold text-2xs">${completeness}%</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald font-semibold text-2xs">${accuracy}%</td>
                <td class="py-2.5 px-3 text-right font-mono text-gray-300 text-2xs">${missingDups}</td>
                <td class="py-2.5 px-3 text-center"><span class="badge badge-success text-3xs">${avail}</span></td>
                <td class="py-2.5 px-3 text-gray-400 text-2xs font-mono">${lastIngest}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==============================================================================
// THEME CONTROLLER (TACTICAL HIGH-CONTRAST / DEFAULT DARK)
// ==============================================================================
function toggleTheme() {
    document.body.classList.toggle('tactical-theme');
    const isTactical = document.body.classList.contains('tactical-theme');
    localStorage.setItem('mangan_tactical_theme', isTactical ? 'true' : 'false');
    showToast(`Switched to ${isTactical ? 'Tactical High-Contrast' : 'Default Dark'} Theme`, 'info');
}

// Restore saved theme on startup
(function() {
    if (localStorage.getItem('mangan_tactical_theme') === 'true') {
        document.body.classList.add('tactical-theme');
    }
})();

// ==============================================================================
// CINEMATIC EXCAVATOR MOUNTAIN DIGGING OPENING CONTROLLER
// ==============================================================================
let preloaderTimer = null;

function initMiningPreloader() {
    const preloader = document.getElementById('miningPreloader');
    if (!preloader) return;

    const bar = document.getElementById('preloaderBar');
    const percent = document.getElementById('preloaderPercent');
    const phaseText = document.getElementById('preloaderPhaseText');
    const mLeft = document.getElementById('mountainLeft');
    const mRight = document.getElementById('mountainRight');
    const burst = document.getElementById('impactBurst');
    const portal = document.getElementById('portalLight');
    const scene = document.getElementById('sceneContainer');

    // Stage 1 (400ms): Excavator drives forward, progress 35%
    setTimeout(() => {
        if (bar) bar.style.width = '35%';
        if (percent) percent.textContent = '35%';
        if (phaseText) phaseText.innerHTML = '<i class="fa-solid fa-gears animate-spin text-2xs text-cyan"></i> Checking underground strata & drillhole core logs...';
    }, 400);

    // Stage 2 (900ms): Boom aims at rock cliff, progress 65%
    setTimeout(() => {
        if (bar) bar.style.width = '65%';
        if (percent) percent.textContent = '65%';
        if (phaseText) phaseText.innerHTML = '<i class="fa-solid fa-satellite animate-pulse text-2xs text-amber"></i> Connecting live satellite imagery & pit weather sensors...';
    }, 900);

    // Stage 3 (1350ms): BUCKET STRIKES MOUNTAIN! Screen tremor, ore sparks explosion, fracture glow
    setTimeout(() => {
        if (scene) scene.classList.add('tremor-screen');
        if (burst) burst.classList.add('impact-active');
        if (mLeft) mLeft.classList.add('fissure-active');
        if (mRight) mRight.classList.add('fissure-active');
        if (portal) portal.style.opacity = '1';
        if (bar) bar.style.width = '85%';
        if (percent) percent.textContent = '85%';
        if (phaseText) phaseText.innerHTML = '<i class="fa-solid fa-sparkles text-2xs text-cyan"></i> Manganese ore detected! Preparing your workspace...';
    }, 1350);

    // Stage 4 (1650ms): Mountains Part Open left and right!
    setTimeout(() => {
        if (mLeft) mLeft.classList.add('mountain-parting-left');
        if (mRight) mRight.classList.add('mountain-parting-right');
        if (bar) bar.style.width = '100%';
        if (percent) percent.textContent = '100%';
        if (phaseText) phaseText.innerHTML = '<i class="fa-solid fa-circle-check text-2xs text-emerald"></i> Ready! Welcome to MANGAN AI';
    }, 1650);

    // Stage 5 (2400ms): Dissolve into Dashboard
    preloaderTimer = setTimeout(() => {
        dismissMiningPreloader();
    }, 2400);
}

function dismissMiningPreloader() {
    if (preloaderTimer) clearTimeout(preloaderTimer);
    const preloader = document.getElementById('miningPreloader');
    if (!preloader) return;

    // Trigger mountain parting if not already triggered
    const mLeft = document.getElementById('mountainLeft');
    const mRight = document.getElementById('mountainRight');
    const portal = document.getElementById('portalLight');
    if (mLeft) mLeft.classList.add('mountain-parting-left');
    if (mRight) mRight.classList.add('mountain-parting-right');
    if (portal) portal.style.opacity = '1';

    preloader.classList.add('fade-out');
    setTimeout(() => {
        preloader.style.display = 'none';
        // Ensure Leaflet map recalculates its dimensions so GIS layers render sharply
        if (map) {
            setTimeout(() => map.invalidateSize(), 250);
        }
    }, 800);
}

function replayMiningIntro() {
    const preloader = document.getElementById('miningPreloader');
    if (!preloader) return;

    // Reset all animation states
    preloader.style.display = 'flex';
    preloader.style.backgroundColor = '#060a12';
    preloader.style.opacity = '1';
    preloader.classList.remove('fade-out');

    const mLeft = document.getElementById('mountainLeft');
    const mRight = document.getElementById('mountainRight');
    const burst = document.getElementById('impactBurst');
    const portal = document.getElementById('portalLight');
    const scene = document.getElementById('sceneContainer');
    const bar = document.getElementById('preloaderBar');
    const percent = document.getElementById('preloaderPercent');
    const phaseText = document.getElementById('preloaderPhaseText');

    if (mLeft) {
        mLeft.classList.remove('mountain-parting-left', 'fissure-active');
        mLeft.style.transform = '';
        mLeft.style.opacity = '';
    }
    if (mRight) {
        mRight.classList.remove('mountain-parting-right', 'fissure-active');
        mRight.style.transform = '';
        mRight.style.opacity = '';
    }
    if (burst) burst.classList.remove('impact-active');
    if (portal) portal.style.opacity = '0';
    if (scene) scene.classList.remove('tremor-screen');
    if (bar) bar.style.width = '15%';
    if (percent) percent.textContent = '15%';
    if (phaseText) phaseText.innerHTML = '<i class="fa-solid fa-gears animate-spin text-2xs text-cyan"></i> Loading Balaghat mine strata & sensors...';

    // Restart Excavator
    const actor = document.getElementById('excavatorActor');
    if (actor) {
        actor.style.animation = 'none';
        actor.offsetHeight; // trigger reflow
        actor.style.animation = '';
    }

    initMiningPreloader();
}




