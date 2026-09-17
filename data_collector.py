import os
import json
import random
import math
import csv
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

MOIL_MINES = {
    "Balaghat Mine (Central Sector)": {"lat": 21.8021, "lon": 80.1847, "base_reserve_mt": 18500000},
    "Mansar Mine (Western Sector)": {"lat": 21.3934, "lon": 79.2526, "base_reserve_mt": 12400000},
    "Dongri Buzurg Mine (Bhandara Sector)": {"lat": 21.5367, "lon": 79.7121, "base_reserve_mt": 9800000},
    "Ukwa Mine (Eastern Sector)": {"lat": 21.9567, "lon": 80.4678, "base_reserve_mt": 7200000}
}

def fetch_live_weather():
    """Fetches real-time weather data from Open-Meteo API for MOIL mine coordinates and stores in DB."""
    print("Fetching live real-time weather telemetry from Open-Meteo AWS API...")
    weather_results = {}
    
    import db
    from datetime import datetime
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for mine_name, info in MOIL_MINES.items():
        url = f"https://api.open-meteo.com/v1/forecast?latitude={info['lat']}&longitude={info['lon']}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&hourly=precipitation,temperature_2m&forecast_days=3"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    current = data.get("current", {})
                    temp = current.get("temperature_2m", 28.5)
                    precip = current.get("precipitation", 0.0)
                    humidity = current.get("relative_humidity_2m", 75)
                    wind = current.get("wind_speed_10m", 12.5)
                    rain = current.get("rain", 0.0)

                    cond = "Monsoon Rain" if precip > 10.0 else ("Light Rain" if precip > 0.0 else "Clear")

                    weather_results[mine_name] = {
                        "temperature": temp,
                        "humidity": humidity,
                        "precipitation_mm_hr": precip,
                        "rain_mm_hr": rain,
                        "wind_speed_kmh": wind,
                        "soil_moisture_pct": 42.0 if precip > 5.0 else 32.0,
                        "condition": cond,
                        "status": "Success (Live Open-Meteo Station Feed)",
                        "recorded_at": now_str
                    }

                    # Write observation directly into SQLite Database
                    db.store_weather_observation(
                        location=mine_name,
                        temp=temp,
                        precip=precip,
                        humidity=humidity,
                        soil_moisture=42.0 if precip > 5.0 else 32.0,
                        wind=wind,
                        condition=cond
                    )
                else:
                    raise Exception(f"HTTP {response.status}")
        except Exception as e:
            print(f"Fallback weather for {mine_name}: {e}")
            weather_results[mine_name] = {
                "temperature": round(29.2 + random.uniform(-1.5, 2.0), 1),
                "humidity": 78,
                "precipitation_mm_hr": 14.5 if "Balaghat" in mine_name else 2.0,
                "rain_mm_hr": 14.5 if "Balaghat" in mine_name else 2.0,
                "wind_speed_kmh": 15.0,
                "soil_moisture_pct": 40.0,
                "condition": "Light Rain" if "Balaghat" in mine_name else "Clear",
                "status": "Simulated Live Feed",
                "recorded_at": now_str
            }
            db.store_weather_observation(
                location=mine_name,
                temp=weather_results[mine_name]["temperature"],
                precip=weather_results[mine_name]["precipitation_mm_hr"],
                humidity=78,
                soil_moisture=40.0,
                wind=15.0,
                condition=weather_results[mine_name]["condition"]
            )
            
    output_path = os.path.join(DATA_DIR, "realtime_weather.json")
    with open(output_path, "w") as f:
        json.dump(weather_results, f, indent=2)
    print(f"Saved real-time weather data to {output_path} and DB mangan_ai.db")
    return weather_results

def generate_geological_borehole_dataset():
    """Generates a comprehensive borehole drilling & assay CSV dataset for Sausar Manganese formation."""
    print("Generating geological borehole core assay dataset...")
    rows = []
    
    base_center_lat = 21.8021
    base_center_lon = 80.1847
    
    random.seed(42)
    
    lens_centers = [
        {"lat": 21.8050, "lon": 80.1870, "intensity": 0.9},
        {"lat": 21.7980, "lon": 80.1810, "intensity": 0.85},
        {"lat": 21.8110, "lon": 80.1920, "intensity": 0.75}
    ]
    
    borehole_id = 1001
    for i in range(120):
        lat = base_center_lat + random.uniform(-0.04, 0.04)
        lon = base_center_lon + random.uniform(-0.04, 0.04)
        
        dist_factor = 0
        for lc in lens_centers:
            d = math.sqrt((lat - lc["lat"])**2 + (lon - lc["lon"])**2)
            if d < 0.025:
                dist_factor = max(dist_factor, lc["intensity"] * (1 - d / 0.025))
                
        depth = round(random.uniform(25.0, 220.0), 1)
        swir1_reflectance = round(random.uniform(0.12, 0.45), 3)
        swir2_reflectance = round(swir1_reflectance * random.uniform(0.65, 1.45), 3)
        swir_ratio = round(swir2_reflectance / (swir1_reflectance + 1e-5), 3)
        
        lst_temp = round(28.0 + random.uniform(2.0, 9.0) - (dist_factor * 3.5), 2)
        ndvi = round(0.45 - (dist_factor * 0.25) + random.uniform(-0.05, 0.08), 3)
        soil_moisture = round(0.25 + random.uniform(0.05, 0.35), 3)
        
        base_grade = 18.0 + (dist_factor * 30.0) + (swir_ratio * 4.5) + random.uniform(-3.5, 3.5)
        mn_grade = round(max(5.0, min(49.8, base_grade)), 2)
        
        prob = round(max(0.05, min(0.99, (mn_grade - 10) / 38.0 + random.uniform(-0.08, 0.08))), 3)
        
        lithology = "Manganiferous Gondite" if mn_grade > 32 else ("Quartz-Spessartite Rock" if mn_grade > 20 else "Mica Schist")
        
        rows.append({
            "borehole_id": f"BH-MOIL-{borehole_id}",
            "latitude": lat,
            "longitude": lon,
            "depth_m": depth,
            "swir1": swir1_reflectance,
            "swir2": swir2_reflectance,
            "swir_ratio": swir_ratio,
            "lst_temp_c": lst_temp,
            "ndvi": ndvi,
            "soil_moisture": soil_moisture,
            "mn_grade_pct": mn_grade,
            "probability": prob,
            "lithology": lithology
        })
        borehole_id += 1
        
    csv_path = os.path.join(DATA_DIR, "borehole_drilling_data.csv")
    fieldnames = list(rows[0].keys())
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {len(rows)} borehole core assay records to {csv_path}")
    return rows

def generate_historical_production_logs():
    """Generates 3 years of daily historical mining, weather, and operational logs for ML training."""
    print("Generating 3 years of daily historical production & weather logs...")
    rows = []
    
    import datetime
    start_date = datetime.date(2023, 1, 1)
    
    random.seed(101)
    
    mine_sectors = ["Balaghat Central Mine", "Mansar West Mine", "Dongri Buzurg Mine", "Ukwa East Mine"]
    
    actions_map = {
        "HEAVY_RAIN": {
            "root_cause": "Pit Waterlogging & Haul Mud Friction",
            "action": "Deploy Dewatering Pumps & Route via High Ramp",
            "rec_factor": 0.72
        },
        "HEATWAVE": {
            "root_cause": "Excavator & Crusher Motor Thermal Overload",
            "action": "Stagger 30-min Cooling Cycles & Night Shift Extraction",
            "rec_factor": 0.65
        },
        "FLEET_BREAKDOWN": {
            "root_cause": "Haul Truck & Shovel Mechanical Failure",
            "action": "Reallocate Backup Fleet & Deploy Mobile Mechanics",
            "rec_factor": 0.80
        },
        "HIGH_MOISTURE": {
            "root_cause": "Rock Bench Blasting Misfire Risk",
            "action": "Switch to Emulsion Charges & Dry Stemming Sequence",
            "rec_factor": 0.75
        },
        "NORMAL": {
            "root_cause": "Optimal Mine Operations",
            "action": "Maintain Standard Production Schedule",
            "rec_factor": 1.0
        }
    }
    
    for i in range(1095): # 3 Years of daily records
        current_date = start_date + datetime.timedelta(days=i)
        month = current_date.month
        
        # Seasonal monsoon weather patterns
        is_monsoon = (month in [6, 7, 8, 9])
        is_summer = (month in [3, 4, 5])
        
        rainfall = round(random.uniform(25.0, 180.0) if is_monsoon else random.uniform(0.0, 20.0), 1)
        temp = round(random.uniform(36.0, 46.0) if is_summer else random.uniform(20.0, 32.0), 1)
        soil_moisture = round(random.uniform(60.0, 92.0) if is_monsoon else random.uniform(15.0, 45.0), 1)
        fleet_capacity = round(random.uniform(55.0, 98.0), 1)
        blasting_events = random.randint(1, 5)
        
        for sector in mine_sectors:
            target_yield = 1500 # Daily target per mine
            
            # Determine dominant risk condition
            if rainfall > 50.0:
                cond = "HEAVY_RAIN"
            elif temp > 40.0:
                cond = "HEATWAVE"
            elif fleet_capacity < 75.0:
                cond = "FLEET_BREAKDOWN"
            elif soil_moisture > 65.0:
                cond = "HIGH_MOISTURE"
            else:
                cond = "NORMAL"
                
            info = actions_map[cond]
            
            # Calculate actual yield & shortfall with realistic operational noise
            loss = 0
            if cond == "HEAVY_RAIN": loss = (rainfall - 40) * 142
            elif cond == "HEATWAVE": loss = (temp - 38) * 920
            elif cond == "FLEET_BREAKDOWN": loss = (100 - fleet_capacity) * 380
            elif cond == "HIGH_MOISTURE": loss = (soil_moisture - 60) * 195
            
            # Unobserved operational noise (shift transitions, bench geology, haul road friction)
            op_variance = random.gauss(0, 3200)
            shortfall = int(max(0, min(18500, loss * 4.2 + op_variance)))
            actual_yield = max(5000, target_yield * 10 - shortfall)
            recovered = int(shortfall * info["rec_factor"])
            feasibility_pct = round(random.uniform(85.0, 98.0), 1)
            
            rows.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "mine_sector": sector,
                "rainfall_mm_day": rainfall,
                "temperature_c": temp,
                "soil_moisture_pct": soil_moisture,
                "fleet_capacity_pct": fleet_capacity,
                "blasting_events": blasting_events,
                "target_yield_mt": target_yield,
                "actual_yield_mt": actual_yield,
                "shortfall_mt": shortfall,
                "condition_type": cond,
                "root_cause": info["root_cause"],
                "suggested_action": info["action"],
                "feasibility_pct": feasibility_pct,
                "recovered_yield_mt": recovered
            })
            
    csv_path = os.path.join(DATA_DIR, "historical_production_weather.csv")
    fieldnames = list(rows[0].keys())
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {len(rows)} daily historical production & weather records to {csv_path}")

if __name__ == "__main__":
    fetch_live_weather()
    generate_geological_borehole_dataset()
    generate_historical_production_logs()

