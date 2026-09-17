"""
==========================================================================
MOIL MANGAN AI — ENTERPRISE SECURITY, AUTHENTICATION & GATEWAY ENGINE (auth.py)
==========================================================================
Provides JWT Bearer token generation (HMAC-SHA256), RBAC permission enforcement,
sliding-window IP rate limiting, parameter range validation, and input sanitization.
"""

import hmac
import hashlib
import base64
import json
import time
from datetime import datetime

SECRET_KEY = "MOIL_MANGAN_AI_SECRET_KEY_2026_PRODUCTION"

# In-memory IP rate limiter: { client_ip: [timestamp1, timestamp2, ...] }
RATE_LIMIT_STORE = {}

# Enterprise RBAC Permissions Configuration
ROLE_PERMISSIONS = {
    "Admin": ["view_dashboard", "inspect_geology", "run_simulation", "optimize_fleet", "retrain_models", "deploy_models", "manage_users", "manage_alerts"],
    "Geologist": ["view_dashboard", "inspect_geology", "ingest_borehole", "view_prospectivity", "ground_truth_validation"],
    "Mining Engineer": ["view_dashboard", "inspect_geology", "blasting_controls", "bench_inspection", "optimize_fleet"],
    "Operations Manager": ["view_dashboard", "run_simulation", "optimize_fleet", "manage_alerts", "daily_planning"],
    "Analyst": ["view_dashboard", "view_analytics", "view_validation", "export_data", "historical_analysis"],
    "Viewer": ["view_dashboard"]
}

# User credentials & roles database with the 6 core mining roles
USER_CREDENTIALS = {
    # Standard designated roles
    "admin": {"password": "moil2026", "full_name": "Executive System Administrator", "role": "Admin", "department": "Executive Management"},
    "geologist": {"password": "moil2026", "full_name": "Dr. A. Sharma (Chief Geologist)", "role": "Geologist", "department": "Geological Exploration & GIS"},
    "mining_engineer": {"password": "moil2026", "full_name": "Er. R. Verma (Lead Mine Engineer)", "role": "Mining Engineer", "department": "Pit & Bench Operations"},
    "operations_manager": {"password": "moil2026", "full_name": "K. Sengupta (General Operations Mgr)", "role": "Operations Manager", "department": "Production & Dispatch"},
    "analyst": {"password": "moil2026", "full_name": "S. Deshmukh (Senior Mining Analyst)", "role": "Analyst", "department": "Corporate Planning"},
    "viewer": {"password": "moil2026", "full_name": "Guest Mining Observer", "role": "Viewer", "department": "Public Stakeholders"},
    
    # Backward compatible aliases
    "cmd_admin": {"password": "moil2026", "full_name": "General Manager Mining (CMD)", "role": "Admin", "department": "Executive Board"},
    "chief_geologist": {"password": "moil2026", "full_name": "Chief Exploration Officer", "role": "Geologist", "department": "Exploration & GIS"},
    "pit_engineer": {"password": "moil2026", "full_name": "Balaghat Pit Mine Manager", "role": "Mining Engineer", "department": "Mine Operations"},
    "ai_data_scientist": {"password": "moil2026", "full_name": "MANGAN AI System Lead", "role": "Admin", "department": "Digital Transformation"}
}

def has_permission(role, permission):
    """Checks if a user role has the required permission."""
    allowed = ROLE_PERMISSIONS.get(role, [])
    return permission in allowed

def get_all_roles_summary():
    """Returns list of all available roles for the UI role switcher."""
    return [
        {"username": "admin", "full_name": "Executive System Administrator", "role": "Admin", "badge": "badge-danger", "desc": "Full permissions: Retraining, Model Deployment, System Config"},
        {"username": "geologist", "full_name": "Dr. A. Sharma (Chief Geologist)", "role": "Geologist", "badge": "badge-cyan", "desc": "Exploration GIS, Core Assays, Ground-Truth Validation"},
        {"username": "mining_engineer", "full_name": "Er. R. Verma (Lead Mine Engineer)", "role": "Mining Engineer", "badge": "badge-warning", "desc": "Blasting Operations, Bench Stability, Ore Extraction"},
        {"username": "operations_manager", "full_name": "K. Sengupta (General Operations Mgr)", "role": "Operations Manager", "badge": "badge-success", "desc": "Scenario Simulator, Fleet Dispatch Optimization, Production Alerts"},
        {"username": "analyst", "full_name": "S. Deshmukh (Senior Mining Analyst)", "role": "Analyst", "badge": "badge-purple", "desc": "Historical Analysis, Shortfall Trends, Model Validation"},
        {"username": "viewer", "full_name": "Guest Mining Observer", "role": "Viewer", "badge": "badge-secondary", "desc": "Read-only access to Dashboards & Public GIS Layers"}
    ]

def base64url_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).rstrip(b'=').decode('utf-8')

def base64url_decode(encoded_str):
    padding = '=' * (4 - (len(encoded_str) % 4))
    return base64.urlsafe_b64decode((encoded_str + padding).encode('utf-8'))

def create_token(username, expiration_seconds=86400):
    """Generates an HMAC-SHA256 signed Bearer JWT token."""
    user_info = USER_CREDENTIALS.get(username, {
        "full_name": username, "role": "Viewer", "department": "General"
    })
    
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": username,
        "name": user_info["full_name"],
        "role": user_info["role"],
        "dept": user_info["department"],
        "permissions": ROLE_PERMISSIONS.get(user_info["role"], []),
        "iat": int(time.time()),
        "exp": int(time.time()) + expiration_seconds
    }

    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    
    signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_token(token):
    """Verifies HMAC signature and expiration of Bearer token. Returns payload dict or None."""
    if not token or token.count('.') != 2:
        return None

    try:
        header_b64, payload_b64, signature_b64 = token.split('.')
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
        
        if not hmac.compare_digest(base64url_encode(expected_sig), signature_b64):
            return None

        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None # Expired

        return payload
    except Exception:
        return None

def authenticate_user(username, password):
    """Verifies credentials and returns signed Bearer token response."""
    user = USER_CREDENTIALS.get(username)
    if not user or user["password"] != password:
        return None, "Invalid username or password"

    token = create_token(username)
    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 86400,
        "user": {
            "username": username,
            "full_name": user["full_name"],
            "role": user["role"],
            "department": user["department"]
        }
    }, None

def check_rate_limit(client_ip, max_requests=60, window_seconds=60):
    """Sliding-window IP rate limiter. Returns (allowed: bool, remaining: int, retry_after: int)."""
    now = time.time()
    timestamps = RATE_LIMIT_STORE.get(client_ip, [])
    # Filter timestamps within current window
    valid_timestamps = [t for t in timestamps if now - t < window_seconds]

    if len(valid_timestamps) >= max_requests:
        oldest_in_window = valid_timestamps[0]
        retry_after = int(window_seconds - (now - oldest_in_window)) + 1
        RATE_LIMIT_STORE[client_ip] = valid_timestamps
        return False, 0, max(1, retry_after)

    valid_timestamps.append(now)
    RATE_LIMIT_STORE[client_ip] = valid_timestamps
    remaining = max_requests - len(valid_timestamps)
    return True, remaining, 0

def validate_simulation_params(params):
    """Validates parameters for the simulation endpoint. Returns (cleaned_params, errors)."""
    errors = []
    cleaned = {}

    try:
        rain = float(params.get("rainfall_mm_day", 45))
        if rain < 0.0 or rain > 500.0:
            errors.append("rainfall_mm_day must be between 0.0 and 500.0 mm/day")
        cleaned["rainfall_mm_day"] = rain
    except (ValueError, TypeError):
        errors.append("rainfall_mm_day must be a valid numeric value")

    try:
        temp = float(params.get("temp_var_c", 0.0))
        if temp < -10.0 or temp > 20.0:
            errors.append("temp_var_c must be between -10.0 and +20.0 °C")
        cleaned["temp_var_c"] = temp
    except (ValueError, TypeError):
        errors.append("temp_var_c must be a valid numeric value")

    try:
        moisture = float(params.get("soil_moisture_pct", 40))
        if moisture < 0.0 or moisture > 100.0:
            errors.append("soil_moisture_pct must be between 0.0% and 100.0%")
        cleaned["soil_moisture_pct"] = moisture
    except (ValueError, TypeError):
        errors.append("soil_moisture_pct must be a valid numeric value")

    try:
        fleet = float(params.get("fleet_capacity_pct", 85))
        if fleet < 0.0 or fleet > 100.0:
            errors.append("fleet_capacity_pct must be between 0.0% and 100.0%")
        cleaned["fleet_capacity_pct"] = fleet
    except (ValueError, TypeError):
        errors.append("fleet_capacity_pct must be a valid numeric value")

    try:
        blasting = float(params.get("blasting_delay_days", 1))
        if blasting < 0.0 or blasting > 14.0:
            errors.append("blasting_delay_days must be between 0 and 14 days")
        cleaned["blasting_delay_days"] = blasting
    except (ValueError, TypeError):
        errors.append("blasting_delay_days must be a valid integer or float")

    try:
        target_prod = float(params.get("target_production_mt", 94000))
        if target_prod < 5000.0 or target_prod > 500000.0:
            errors.append("target_production_mt must be between 5,000 and 500,000 MT")
        cleaned["target_production_mt"] = target_prod
    except (ValueError, TypeError):
        errors.append("target_production_mt must be a valid numeric value")

    try:
        fleet_avail = float(params.get("fleet_availability_pct", 90))
        if fleet_avail < 0.0 or fleet_avail > 100.0:
            errors.append("fleet_availability_pct must be between 0.0% and 100.0%")
        cleaned["fleet_availability_pct"] = fleet_avail
    except (ValueError, TypeError):
        errors.append("fleet_availability_pct must be a valid numeric value")

    try:
        equip_util = float(params.get("equipment_utilization_pct", params.get("fleet_capacity_pct", 85)))
        if equip_util < 0.0 or equip_util > 100.0:
            errors.append("equipment_utilization_pct must be between 0.0% and 100.0%")
        cleaned["equipment_utilization_pct"] = equip_util
    except (ValueError, TypeError):
        errors.append("equipment_utilization_pct must be a valid numeric value")

    try:
        breakdown = float(params.get("breakdown_hours", 12))
        if breakdown < 0.0 or breakdown > 168.0:
            errors.append("breakdown_hours must be between 0 and 168 hours")
        cleaned["breakdown_hours"] = breakdown
    except (ValueError, TypeError):
        errors.append("breakdown_hours must be a valid numeric value")

    try:
        blast_eff = float(params.get("blast_efficiency_pct", 85))
        if blast_eff < 0.0 or blast_eff > 100.0:
            errors.append("blast_efficiency_pct must be between 0.0% and 100.0%")
        cleaned["blast_efficiency_pct"] = blast_eff
    except (ValueError, TypeError):
        errors.append("blast_efficiency_pct must be a valid numeric value")

    return cleaned, errors
