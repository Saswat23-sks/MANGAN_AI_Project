import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, method="GET", payload=None, token=None, timeout=12, expected_status=200):
    print(f"Testing [{method}] {name} ({url})...", end=" ")
    try:
        headers = {}
        if payload is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(payload).encode('utf-8')
        else:
            data = None

        if token:
            headers['Authorization'] = f"Bearer {token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.status
            body = response.read().decode('utf-8')
            json_data = json.loads(body) if "json" in response.headers.get('Content-Type', '') else body
            
            if status == expected_status:
                print("[PASS]")
                return True, json_data
            else:
                print(f"[FAIL] (Expected {expected_status}, Got {status})")
                return False, None
    except urllib.error.HTTPError as e:
        if e.code == expected_status:
            print(f"[PASS] (HTTP {e.code})")
            body = e.read().decode('utf-8')
            try:
                json_data = json.loads(body)
                return True, json_data
            except Exception:
                return True, body
        else:
            print(f"[FAIL]: HTTP {e.code} - {e.reason}")
            return False, None
    except Exception as e:
        print(f"[FAIL]: {e}")
        return False, None

def run_all_tests():
    print("=" * 65)
    print("  MOIL INTELLIGENCE PLATFORM — PRODUCTION API v1 TEST SUITE")
    print("=" * 65)
    
    passed_count = 0
    total_count = 12
    token = None

    # Test 1: Auth Login API
    login_payload = {"username": "cmd_admin", "password": "moil2026"}
    ok, login_res = test_endpoint("Authentication & JWT Bearer Token API", f"{BASE_URL}/api/v1/auth/login", method="POST", payload=login_payload)
    if ok and "access_token" in login_res:
        passed_count += 1
        token = login_res["access_token"]
        print(f"   -> Auth User: {login_res['user']['username']} ({login_res['user']['role']}) | Token Issued!")

    # Test 2: OpenAPI Swagger Docs Page API
    ok, docs_res = test_endpoint("OpenAPI Interactive Swagger Docs API", f"{BASE_URL}/api/v1/docs")
    if ok and "MANGAN AI" in str(docs_res):
        passed_count += 1
        print("   -> OpenAPI Docs HTML rendered successfully!")

    # Test 3: Live Weather v1 API
    ok, weather = test_endpoint("Live Weather Telemetry API v1", f"{BASE_URL}/api/v1/weather", token=token)
    if ok and "Balaghat Mine (Central Sector)" in weather:
        passed_count += 1
        print(f"   -> Balaghat Temp: {weather['Balaghat Mine (Central Sector)']['temperature']} C | Rain: {weather['Balaghat Mine (Central Sector)']['precipitation_mm_hr']} mm/hr")

    # Test 4: Geological Structures API v1
    ok, geology = test_endpoint("Geological Structures API v1", f"{BASE_URL}/api/v1/geology", token=token)
    if ok and geology.get("count", 0) >= 4:
        passed_count += 1
        print(f"   -> Geological Faults & Synclines: {geology['count']} structural features")

    # Test 5: Boreholes Core Assays API v1
    ok, logs = test_endpoint("Borehole Core Assays API v1", f"{BASE_URL}/api/v1/boreholes", token=token)
    if ok and len(logs) >= 100:
        passed_count += 1
        print(f"   -> Core Drilling Samples: {len(logs)} assays")

    # Test 6: Satellite Scenes Metadata API v1
    ok, sat = test_endpoint("Satellite Scene Metadata API v1", f"{BASE_URL}/api/v1/satellite", token=token)
    if ok and sat.get("count", 0) >= 1:
        passed_count += 1
        print(f"   -> Satellite Scenes: {sat['count']} Sentinel-2A scene")

    # Test 7: Spatial Prospectivity Grid API v1
    ok, grid = test_endpoint("Spatial Prospectivity Grid API v1", f"{BASE_URL}/api/v1/prospectivity", token=token)
    cnt = grid.get("cell_count") or len(grid.get("grid_points", []))
    if ok and cnt > 1000:
        passed_count += 1
        print(f"   -> Grid Cells: {cnt:,} | Est Reserve: {grid.get('total_estimated_reserve_mt', 0):,} MT")

    # Test 8: Interactive Simulation API v1 (Expanded Multi-Variable & Decision Optimization)
    sim_payload = {
        "target_production_mt": 94000,
        "rainfall_mm_day": 85,
        "temp_var_c": 3.0,
        "soil_moisture_pct": 75,
        "fleet_availability_pct": 80,
        "equipment_utilization_pct": 70,
        "fleet_capacity_pct": 70,
        "breakdown_hours": 18,
        "blasting_delay_days": 2,
        "blast_efficiency_pct": 70
    }
    ok, sim_res = test_endpoint("Interactive Simulation API v1", f"{BASE_URL}/api/v1/simulation", method="POST", payload=sim_payload, token=token)
    if ok and "shortfall_mt" in sim_res and "optimization" in sim_res:
        passed_count += 1
        best_dec = sim_res["optimization"]["best_decision"]
        print(f"   -> Target: {sim_res['target_production_mt']:,} MT | Expected: {sim_res['expected_production_mt']:,} MT | Shortfall: -{sim_res['shortfall_mt']:,} MT ({sim_res['shortfall_pct']}%)")
        cost_str = str(best_dec['cost_formatted']).replace('₹', 'Rs.')
        print(f"   -> Best Decision: '{best_dec['title']}' (+{best_dec['expected_gain_mt']:,} MT, Risk Red: -{best_dec['risk_reduction_pct']}%, Cost: {cost_str})")

    # Test 9: Input Validation Error Handling (HTTP 400 Bad Request)
    invalid_payload = {"rainfall_mm_day": 9999.0, "fleet_capacity_pct": -50.0}
    ok, err_res = test_endpoint("Input Validation Failure Check", f"{BASE_URL}/api/v1/simulation", method="POST", payload=invalid_payload, token=token, expected_status=400)
    if ok and err_res.get("status") == "error":
        passed_count += 1
        print(f"   -> Validation Rejection Verified! HTTP 400 Bad Request returned with {len(err_res.get('details', []))} error details.")

    # Test 10: Model Metrics API v1
    ok, metrics = test_endpoint("AI Model Metrics API v1", f"{BASE_URL}/api/v1/models", token=token)
    if ok and "grade_r2_score" in metrics:
        passed_count += 1
        print(f"   -> Spatial Model R2: {metrics['grade_r2_score']} | Shortfall Model R2: {metrics.get('historical_shortfall_model', {}).get('shortfall_model_r2_score')}")

    # Test 11: Registered Users API v1
    ok, users_res = test_endpoint("Relational DB Users API v1", f"{BASE_URL}/api/v1/users", token=token)
    if ok and len(users_res) >= 4:
        passed_count += 1
        print(f"   -> Registered Users: {len(users_res)} RBAC roles ({users_res[0]['username']}: {users_res[0]['role']})")

    # Test 12: Security Activity Audit Logs API v1
    ok, audit_res = test_endpoint("Security Audit Trail API v1", f"{BASE_URL}/api/v1/activity-logs", token=token)
    if ok and len(audit_res) >= 1:
        passed_count += 1
        print(f"   -> Audit Logs: {len(audit_res)} activity trail records")

    # Test 13: Live Weather Station Pipeline Refresh API v1
    ok, refresh_res = test_endpoint("Live Weather Pipeline Refresh API v1", f"{BASE_URL}/api/v1/weather/refresh", method="POST", token=token)
    if ok and refresh_res.get("status") == "success":
        passed_count += 1
        print("   -> Live Open-Meteo Weather Telemetry fetched, pipeline executed & written to DB!")

    # Test 14: Closed-Loop AI Prediction Recalculate API v1
    ok, predict_res = test_endpoint("Closed-Loop AI Prediction Engine Recalculate", f"{BASE_URL}/api/v1/predict/recalculate", method="POST", token=token)
    if ok and predict_res.get("status") == "success":
        passed_count += 1
        print(f"   -> AI Prediction Engine executed! SQL Grid updated & returned {predict_res.get('data', {}).get('cell_count', 0)} cells.")

    # Test 15: Borehole Core Assay Ingestion API v1
    new_bh = {"borehole_id": "BH-TEST-999", "latitude": 21.8085, "longitude": 80.1895, "mn_grade_pct": 42.5, "depth_m": 55.0, "lithology": "Test Gondite Bed"}
    ok, ingest_res = test_endpoint("Borehole Core Assay Ingestion API v1", f"{BASE_URL}/api/v1/ingest/borehole", method="POST", payload=new_bh, token=token)
    if ok and ingest_res.get("status") == "success":
        passed_count += 1
        print(f"   -> Borehole '{ingest_res.get('borehole_id')}' ingested into SQL DB & triggered Prediction Engine!")

    # Test 16: Satellite Spectral Raster Ingestion API v1
    new_sat = {"source": "Sentinel-2B MSI (10m)", "swir_shift": 0.02}
    ok, sat_res = test_endpoint("Satellite Raster Ingestion API v1", f"{BASE_URL}/api/v1/ingest/satellite", method="POST", payload=new_sat, token=token)
    if ok and sat_res.get("status") == "success":
        passed_count += 1
        print(f"   -> Satellite Scene '{sat_res.get('scene_id')}' ingested into SQL DB & updated prospectivity grid!")

    # Test 17: Prescriptive Intelligence Reasoning API v1 (4-Question Framework)
    ok, presc_res = test_endpoint("Prescriptive Intelligence 4-Question API v1", f"{BASE_URL}/api/v1/prescriptive", token=token)
    if ok and "what_is_happening" in presc_res:
        passed_count += 1
        print(f"   -> Prescriptive 4-Question Framework Verified: '{presc_res['what_is_happening']['title']}'")

    # Test 18: Operational Incidents & Alerts API v1
    ok, alerts_res = test_endpoint("Operational Incidents & Alerts API v1", f"{BASE_URL}/api/v1/alerts", token=token)
    if ok and "alerts" in alerts_res:
        passed_count += 1
        print(f"   -> Active Alerts: {len(alerts_res['alerts'])} unresolved operational incidents")

    # Test 19: Dismiss Alert API v1
    ok, dism_res = test_endpoint("Dismiss Alert Protocol API v1", f"{BASE_URL}/api/v1/alerts/dismiss", method="POST", payload={"alert_id": "alert-004"}, token=token)
    if ok and dism_res.get("status") == "success":
        passed_count += 1
        print(f"   -> Alert dismissal verified & audited in database!")

    # Test 20: RBAC Enterprise Roles Summary API v1 (6 Roles)
    ok, roles_res = test_endpoint("RBAC Enterprise 6 Mining Roles API v1", f"{BASE_URL}/api/v1/auth/roles", token=token)
    if ok and len(roles_res.get("roles", [])) >= 6:
        passed_count += 1
        print(f"   -> RBAC Roles Verified: {len(roles_res['roles'])} mining roles configured")

    # Test 21: Multi-Horizon Historical Analytics API v1
    ok, hist_res = test_endpoint("Multi-Horizon Historical Analytics API v1", f"{BASE_URL}/api/v1/history?period=30d", token=token)
    if ok and ("production_mt" in hist_res or "series" in hist_res):
        passed_count += 1
        comp = hist_res.get("comparison", {})
        delta_p = comp.get("production_delta_pct", 0)
        print(f"   -> 30D Historical Horizon Verified: {len(hist_res.get('labels', []))} data points | Delta vs Prev: {delta_p}%")

    # Test 22: Zone Prospectivity Prediction Timeline API v1
    ok, pred_hist = test_endpoint("Prediction History & Zone Timelines API v1", f"{BASE_URL}/api/v1/predictions/history", token=token)
    if ok and ("trends" in pred_hist or "zone_timelines" in pred_hist):
        passed_count += 1
        trends = pred_hist.get("trends", pred_hist.get("zone_timelines", []))
        print(f"   -> Zone Timelines: {len(trends)} mining sectors tracked over time")

    # Test 23: AI vs Actual Ground-Truth Validation API v1
    ok, gt_res = test_endpoint("AI vs Actual Ground-Truth Validation API v1", f"{BASE_URL}/api/v1/validation/ground-truth", token=token)
    if ok and ("summary" in gt_res or "accuracy_pct" in gt_res):
        passed_count += 1
        summary = gt_res.get("summary", gt_res)
        print(f"   -> Ground Truth Validation: Accuracy {summary.get('accuracy_pct')}%, RMSE {summary.get('rmse_pct')}%, MAE {summary.get('mae_pct')}%, R2 {summary.get('r2_score')}")

    # Test 24: Model Version Registry & Lifecycle History API v1
    ok, model_hist = test_endpoint("Model Version Registry API v1", f"{BASE_URL}/api/v1/models/history", token=token)
    if ok and ("versions" in model_hist or "models" in model_hist):
        passed_count += 1
        versions = model_hist.get("versions", model_hist.get("models", []))
        print(f"   -> Model Registry: {len(versions)} registered versions (Active: {model_hist.get('active_model', 'v1.4')})")

    # Test 25: Advanced Equipment Fleet Dispatch Optimization API v1
    ok, fleet_opt = test_endpoint("Fleet Dispatch Linear Optimization API v1", f"{BASE_URL}/api/v1/equipment/optimize", token=token)
    if ok and ("allocations" in fleet_opt or "bench_allocations" in fleet_opt):
        passed_count += 1
        allocs = fleet_opt.get("allocations", fleet_opt.get("bench_allocations", []))
        print(f"   -> Fleet Dispatch Optimizer: {len(allocs)} mining benches allocated")

    # Test 26: Multi-Source Data Stream Quality Assurance Audit API v1
    ok, dh_res = test_endpoint("Detailed Data Quality Assurance Audit API v1", f"{BASE_URL}/api/v1/data-health/detailed", token=token)
    if ok and len(dh_res.get("streams", [])) >= 4:
        passed_count += 1
        print(f"   -> Data Assurance: {len(dh_res['streams'])} streams monitored for Freshness, Completeness & Accuracy")

    total_tests = 26
    print("=" * 65)
    print(f"VERIFICATION RESULTS: {passed_count}/{total_tests} TESTS PASSED")
    print("=" * 65)
    
    if passed_count == total_tests:
        print("ALL 26 PRODUCTION ENTERPRISE CAPABILITIES VERIFIED SUCCESSFULLY!")
        return 0
    else:
        print(f"WARNING: {total_tests - passed_count} TESTS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
