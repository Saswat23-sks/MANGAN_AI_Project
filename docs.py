"""
==========================================================================
MOIL MANGAN AI — INTERACTIVE OPENAPI / SWAGGER DOCUMENTATION (docs.py)
==========================================================================
Generates an enterprise dark-mode interactive Swagger / OpenAPI HTML documentation UI
served at http://localhost:8000/api/v1/docs.
"""

def render_openapi_docs_html():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MANGAN AI — Enterprise API v1 Specification & Documentation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        :root {
            --bg-dark: #090d16;
            --panel-bg: rgba(15, 23, 42, 0.90);
            --border-color: rgba(255, 255, 255, 0.12);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-cyan: #38bdf8;
            --accent-emerald: #10b981;
            --accent-purple: #a855f7;
            --accent-amber: #f59e0b;
            --accent-red: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-dark);
            color: var(--text-main);
            padding: 24px;
            line-height: 1.5;
        }
        .header-bar {
            background: linear-gradient(135deg, rgba(14, 116, 144, 0.25), rgba(15, 23, 42, 0.95));
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            backdrop-filter: blur(12px);
        }
        .header-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 10px; }
        .header-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        .meta-tags { display: flex; gap: 10px; margin-top: 14px; }
        .tag { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
        .tag-blue { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.3); }
        .tag-emerald { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.3); }

        .endpoint-card {
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            transition: all 0.2s ease;
        }
        .endpoint-card:hover { border-color: rgba(56, 189, 248, 0.4); }
        .endpoint-header {
            padding: 14px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid var(--border-color);
        }
        .method-badge {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 6px;
            min-width: 60px;
            text-align: center;
        }
        .get { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
        .post { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
        .endpoint-path { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #fff; margin-left: 12px; }
        .endpoint-desc { font-size: 12px; color: var(--text-muted); margin-left: auto; margin-right: 20px; }
        .endpoint-body { padding: 16px 18px; font-size: 13px; }
        .code-box {
            background: #020617;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11.5px;
            color: #e2e8f0;
            overflow-x: auto;
            margin-top: 8px;
        }
        .sec-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent-cyan); margin-top: 10px; margin-bottom: 4px; display: block; }
    </style>
</head>
<body>

    <div class="header-bar">
        <h1 class="header-title"><i class="fa-solid fa-code text-cyan"></i> MANGAN AI — Production REST API Specification v1.0</h1>
        <p class="header-sub">MOIL Limited Manganese Reserve & Production Intelligence Gateway API Endpoint Specifications</p>
        <div class="meta-tags">
            <span class="tag tag-blue">API VERSION: v1.0.0</span>
            <span class="tag tag-emerald">BASE URL: http://localhost:8000/api/v1/</span>
            <span class="tag tag-blue">AUTH: Bearer JWT</span>
            <span class="tag tag-emerald">RATE LIMIT: 60 REQ/MIN</span>
        </div>
    </div>

    <!-- Endpoint 1: Auth Login -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/api/v1/auth/login</span>
            </div>
            <span class="endpoint-desc">Authenticates user credentials and generates a signed Bearer JWT token</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
        <div class="endpoint-body">
            <span class="sec-label">Request Body (JSON):</span>
            <div class="code-box">
{
  "username": "cmd_admin",
  "password": "moil2026"
}
            </div>
            <span class="sec-label">Sample Response (200 OK):</span>
            <div class="code-box">
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "username": "cmd_admin",
    "full_name": "General Manager Mining (CMD)",
    "role": "Executive Director",
    "department": "Executive Board"
  }
}
            </div>
        </div>
    </div>

    <!-- Endpoint 2: Weather -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/api/v1/weather</span>
            </div>
            <span class="endpoint-desc">Fetches live meteorological telemetry for Balaghat Mining Sector</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
        <div class="endpoint-body">
            <span class="sec-label">Sample Response:</span>
            <div class="code-box">
{
  "Balaghat Mine (Central Sector)": {
    "temperature": 27.5,
    "precipitation_mm_hr": 0.0,
    "humidity": 62.0,
    "soil_moisture_pct": 38.0,
    "condition": "Clear",
    "timestamp": "2026-09-11 18:30:00"
  }
}
            </div>
        </div>
    </div>

    <!-- Endpoint 3: Prospectivity -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/api/v1/prospectivity</span>
            </div>
            <span class="endpoint-desc">Returns 1,764 spatial grid predictions joined with satellite rasters</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
        <div class="endpoint-body">
            <span class="sec-label">Sample Response:</span>
            <div class="code-box">
{
  "cell_count": 1764,
  "total_estimated_reserve_mt": 83110134,
  "grid_points": [
    {
      "cell_id": 1,
      "lat": 21.76,
      "lng": 80.14,
      "probability": 18.5,
      "mn_grade_pct": 21.4,
      "confidence_pct": 87.2,
      "est_tonnage_mt": 14200,
      "exploration_priority_score": 16.1,
      "exploration_class": "LOW"
    }
  ]
}
            </div>
        </div>
    </div>

    <!-- Endpoint 4: Simulation -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge post">POST</span>
                <span class="endpoint-path">/api/v1/simulation</span>
            </div>
            <span class="endpoint-desc">Executes What-If operational scenario simulation with input validation</span>
            <span class="tag tag-blue">200 OK / 400 BAD REQUEST</span>
        </div>
        <div class="endpoint-body">
            <span class="sec-label">Request Body (JSON):</span>
            <div class="code-box">
{
  "rainfall_mm_day": 85.0,
  "temp_var_c": 3.0,
  "soil_moisture_pct": 75.0,
  "fleet_capacity_pct": 70.0,
  "blasting_delay_days": 1
}
            </div>
            <span class="sec-label">Sample Response:</span>
            <div class="code-box">
{
  "target_yield_mt": 94000,
  "actual_yield_mt": 69495,
  "shortfall_mt": 24505,
  "shortfall_pct": 26.1,
  "risk_level": "CRITICAL RISK",
  "suggestions": [
    {
      "title": "🌧️ ML Flood Advisory: Balaghat Pit Dewatering",
      "priority": "HIGH",
      "feasibility": "96% Feasible",
      "impact": "+5,616 MT Yield Protected"
    }
  ]
}
            </div>
        </div>
    </div>

    <!-- Endpoint 5: Models -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/api/v1/models</span>
            </div>
            <span class="endpoint-desc">Returns active AI model registry version metrics and feature importances</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
    </div>

    <!-- Endpoint 6: Users -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/api/v1/users</span>
            </div>
            <span class="endpoint-desc">Returns registered RBAC user profiles directory</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
    </div>

    <!-- Endpoint 7: Activity Logs -->
    <div class="endpoint-card">
        <div class="endpoint-header">
            <div style="display:flex; align-items:center;">
                <span class="method-badge get">GET</span>
                <span class="endpoint-path">/api/v1/activity-logs</span>
            </div>
            <span class="endpoint-desc">Returns security audit trail logs</span>
            <span class="tag tag-emerald">200 OK</span>
        </div>
    </div>

</body>
</html>
"""
