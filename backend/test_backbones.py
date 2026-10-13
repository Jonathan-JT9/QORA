"""
Test all supported backbones in HQCNN
- resnet50
- convnext_small
- efficientnet_b4
"""

import sys
import os
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import torch
from models.hqcnn_model import create_hqcnn_model
from services.gradcam import generate_gradcam_overlay
import numpy as np

def test_backbones():
    backbones = ["resnet50", "convnext_small", "efficientnet_b4"]
    dummy_cxr = torch.rand(1, 3, 224, 224)
    dummy_np = np.uint8(dummy_cxr[0].permute(1, 2, 0).numpy() * 255)

    for bb in backbones:
        print(f"\nTesting Backbone: {bb}...")
        model = create_hqcnn_model(backbone_name=bb, pretrained=False)
        res = model.predict_sample(dummy_cxr)
        print(f"  [OK] Forward inference passed: P(TB)={res['tb_probability']}, confidence={res['confidence_score']}%")
        
        cam_res = generate_gradcam_overlay(model, dummy_cxr, dummy_np)
        print(f"  [OK] Grad-CAM overlay generated. Top zone: {cam_res['anatomical_zones'][0]['name']}")

    print("\n[SUCCESS] All 3 backbones verified!")

if __name__ == "__main__":
    test_backbones()
