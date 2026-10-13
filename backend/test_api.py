"""
Test Flask API Endpoints with Test Client
- GET /api/health
- GET /api/models
- GET /api/samples
- POST /api/predict (synthetic CXR)
- GET /api/history
- POST /api/report/regenerate
"""

import sys
import os
import io
import json

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from utils.sample_generator import generate_synthetic_cxr

def test_api():
    print("=========================================")
    print("QORA REST API VERIFICATION")
    print("=========================================")
    
    app = create_app()
    client = app.test_client()

    # 1. Health check
    print("\n[1] Testing GET /api/health...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    print(f"  [OK] Status: {data.get('status')}")
    print(f"  [OK] Simulator: {data.get('quantum_simulator')}")

    # 2. Models list
    print("\n[2] Testing GET /api/models...")
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.get_json()
    print(f"  [OK] Supported Backbones: {list(data.get('backbones', {}).keys())}")

    # 3. Samples list
    print("\n[3] Testing GET /api/samples...")
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.get_json()
    print(f"  [OK] Sample presets count: {len(data.get('samples', []))}")
    preset = data['samples'][1]  # Apical TB

    # 4. Predict endpoint with sample
    print("\n[4] Testing POST /api/predict...")
    payload = {
        "image_data": preset["image_data_uri"],
        "backbone": "resnet50",
        "threshold": 0.50,
        "patient_tag": "PT-TEST-001",
        "doctor_notes": "Suspected apical lesion in right upper lobe",
        "colormap": "jet"
    }
    res = client.post("/api/predict", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
    pred_data = res.get_json()
    print(f"  [OK] Verdict: {pred_data.get('prediction')}")
    print(f"  [OK] P(TB): {pred_data.get('tb_probability')}")
    print(f"  [OK] Confidence: {pred_data.get('confidence_score')}%")
    print(f"  [OK] Quantum Readout Dims: {pred_data.get('quantum_circuit', {}).get('output_dimension')}")
    print(f"  [OK] Top Activated Zones: {[z['name'] for z in pred_data.get('top_activated_zones', [])]}")
    print(f"  [OK] Visualizations keys: {list(pred_data.get('visualizations', {}).keys())}")

    # 5. History endpoint
    print("\n[5] Testing GET /api/history...")
    res = client.get("/api/history")
    assert res.status_code == 200
    hist_data = res.get_json()
    print(f"  [OK] History records count: {hist_data.get('count')}")
    assert hist_data.get('count') >= 1

    # 6. Report regeneration
    print("\n[6] Testing POST /api/report/regenerate...")
    regen_payload = {
        "prediction_result": pred_data,
        "top_activated_zones": pred_data.get("top_activated_zones", []),
        "doctor_notes": "Updated note: Sputum GeneXpert ordered."
    }
    res = client.post("/api/report/regenerate", data=json.dumps(regen_payload), content_type="application/json")
    assert res.status_code == 200
    regen_data = res.get_json()
    print(f"  [OK] Regenerated report preview: {regen_data.get('clinical_report')[:120]}...")

    print("\n=========================================")
    print("ALL REST API ENDPOINTS PASSED SUCCESSFULLY!")
    print("=========================================")

if __name__ == "__main__":
    test_api()
