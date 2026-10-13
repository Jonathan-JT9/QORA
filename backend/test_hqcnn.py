"""
Unit Verification Script for QORA Core Hybrid Models
Tests:
1. QuantumLayer (6 Qubits, 18-dim multi-basis measurements)
2. CXRBackboneExtractor (ResNet50 / ConvNeXt / EfficientNet)
3. Full HQCNNModel forward pass & metadata inspection
4. Grad-CAM generation & Anatomical Zone mapping
5. Sample synthetic radiograph generation
"""

import sys
import os
import io

# Set UTF-8 for console output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import torch
import numpy as np

def run_tests():
    print("=========================================")
    print("QORA MODEL SUITE VERIFICATION")
    print("=========================================")

    # 1. Test Quantum Layer
    print("\n[Test 1] Testing QuantumLayer (6-Qubit VQC, 18 outputs)...")
    from models.quantum_layer import QuantumLayer, QuantumCircuitConfig
    
    q_config = QuantumCircuitConfig(n_qubits=6, n_layers=3)
    qlayer = QuantumLayer(config=q_config)
    
    dummy_angles = torch.rand(2, 6) * 3.14159  # Batch size 2, 6 qubits in [0, pi]
    q_out = qlayer(dummy_angles)
    
    print(f"  [OK] Input shape: {dummy_angles.shape}")
    print(f"  [OK] Output shape: {q_out.shape} (Expected: (2, 18))")
    assert q_out.shape == (2, 18), f"Expected shape (2, 18), got {q_out.shape}"
    
    inspection = qlayer.inspect_measurements(dummy_angles[0])
    print(f"  [OK] Measurement keys: {list(inspection['measurements'].keys())}")
    print(f"  [OK] Sample Pauli-Z expvals: {inspection['measurements']['pauli_z']}")
    print(f"  [OK] Sample Pauli-X expvals: {inspection['measurements']['pauli_x']}")
    print(f"  [OK] Sample Pauli-Y expvals: {inspection['measurements']['pauli_y']}")
    assert len(inspection['raw_18_dim']) == 18

    # 2. Test Synthetic CXR Generator
    print("\n[Test 2] Testing Synthetic CXR Generator...")
    from utils.sample_generator import generate_synthetic_cxr
    pil_img, data_uri = generate_synthetic_cxr("apical_tb")
    print(f"  [OK] Generated image size: {pil_img.size}")
    print(f"  [OK] Data URI prefix: {data_uri[:40]}...")
    assert pil_img.size == (224, 224)

    # 3. Test Full HQCNN Model with ResNet50
    print("\n[Test 3] Testing HQCNNModel (ResNet50 Backbone)...")
    from models.hqcnn_model import create_hqcnn_model
    
    model = create_hqcnn_model(backbone_name="resnet50", pretrained=False, threshold=0.50)
    dummy_cxr = torch.rand(1, 3, 224, 224)
    
    res = model.predict_sample(dummy_cxr, custom_threshold=0.50)
    print(f"  [OK] Prediction: {res['prediction']}")
    print(f"  [OK] TB Probability: {res['tb_probability']}")
    print(f"  [OK] Confidence Score: {res['confidence_score']}%")
    print(f"  [OK] Logit: {res['logit']}")
    print(f"  [OK] Quantum Circuit Qubits: {res['quantum_circuit']['n_qubits']}")
    assert "quantum_circuit" in res

    # 4. Test Grad-CAM & Anatomical Zone Localization
    print("\n[Test 4] Testing Grad-CAM & Anatomical Zone Mapping...")
    from services.gradcam import generate_gradcam_overlay
    
    cxr_np = np.uint8(dummy_cxr[0].permute(1, 2, 0).numpy() * 255)
    cam_res = generate_gradcam_overlay(model, dummy_cxr, cxr_np)
    print(f"  [OK] Number of Anatomical Zones evaluated: {len(cam_res['anatomical_zones'])}")
    for z in cam_res['anatomical_zones'][:3]:
        print(f"    - {z['name']}: Peak={z['peak_activation']}, Mean={z['mean_activation']}")
    assert len(cam_res['anatomical_zones']) == 6

    # 5. Test Gemini Clinical Report Fallback
    print("\n[Test 5] Testing Gemini Clinical Decision Support Report...")
    from services.gemini import generate_clinical_report
    report = generate_clinical_report(res, cam_res['top_activated_zones'], "Test doctor note")
    print(f"  [OK] Generated report preview (first 200 chars):\n{report[:200]}...\n")
    assert "QORA CLINICAL DECISION SUPPORT REPORT" in report

    print("=========================================")
    print("ALL QORA UNIT TESTS PASSED SUCCESSFULLY!")
    print("=========================================")

if __name__ == "__main__":
    run_tests()
