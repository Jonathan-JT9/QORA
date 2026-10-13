"""
QORA Prediction & Analysis Routes
Provides endpoints for CXR radiograph classification, Grad-CAM generation,
quantum circuit readout inspection, Gemini report generation, and history tracking.
"""

import base64
import io
import os
from typing import Dict, Optional, Tuple

import numpy as np
import torch
from flask import Blueprint, jsonify, request
from PIL import Image

from models.backbone import SUPPORTED_BACKBONES
from models.hqcnn_model import HQCNNModel, create_hqcnn_model
from services.gemini import generate_clinical_report
from services.gradcam import generate_gradcam_overlay
from services.supabase_client import get_supabase_service
from utils.sample_generator import generate_synthetic_cxr

predict_bp = Blueprint("predict", __name__)

# Cache for instantiated models by backbone name
_MODEL_CACHE: Dict[str, HQCNNModel] = {}

def get_device() -> torch.device:
    """Selects CUDA if available and not explicitly disabled, else CPU."""
    device_pref = os.getenv("DEVICE", "auto").lower()
    if device_pref == "cuda" and torch.cuda.is_available():
        return torch.device("cuda")
    if device_pref == "cpu":
        return torch.device("cpu")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_cached_model(backbone_name: str = "resnet50", threshold: float = 0.50) -> HQCNNModel:
    """Retrieves or creates cached model instance."""
    if backbone_name not in SUPPORTED_BACKBONES:
        backbone_name = "resnet50"

    device = get_device()
    if backbone_name not in _MODEL_CACHE:
        model = create_hqcnn_model(
            backbone_name=backbone_name,
            pretrained=True,
            threshold=threshold,
            device=device
        )
        model.eval()
        _MODEL_CACHE[backbone_name] = model

    _MODEL_CACHE[backbone_name].threshold = threshold
    return _MODEL_CACHE[backbone_name]


def preprocess_image_file(file_storage_or_bytes) -> Tuple[torch.Tensor, np.ndarray]:
    """
    Parses and preprocesses incoming radiograph file (DICOM, PNG, JPEG)
    into a (1, 3, 224, 224) torch.FloatTensor normalized to [0, 1]
    and a (224, 224, 3) uint8 numpy image for display.
    """
    # Check if input is bytes or FileStorage
    if hasattr(file_storage_or_bytes, "read"):
        raw_bytes = file_storage_or_bytes.read()
    elif isinstance(file_storage_or_bytes, bytes):
        raw_bytes = file_storage_or_bytes
    else:
        raise ValueError("Unsupported image input type")

    # Check for DICOM magic number
    is_dicom = len(raw_bytes) > 132 and raw_bytes[128:132] == b"DICM"

    if is_dicom:
        try:
            import pydicom
            dcm = pydicom.dcmread(io.BytesIO(raw_bytes))
            pixel_array = dcm.pixel_array.astype(np.float32)
            # Windowing / normalization to [0, 255]
            if "RescaleSlope" in dcm and "RescaleIntercept" in dcm:
                pixel_array = pixel_array * dcm.RescaleSlope + dcm.RescaleIntercept

            p_min, p_max = pixel_array.min(), pixel_array.max()
            if p_max - p_min > 1e-5:
                pixel_array = (pixel_array - p_min) / (p_max - p_min) * 255.0
            else:
                pixel_array = np.zeros_like(pixel_array)

            pixel_uint8 = pixel_array.astype(np.uint8)
            pil_img = Image.fromarray(pixel_uint8).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode DICOM format: {e}")
    else:
        try:
            pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid image format. Please upload valid PNG, JPEG, or DICOM files: {e}")

    # Resize to standardized input dimension 224x224
    pil_resized = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
    np_rgb = np.array(pil_resized, dtype=np.uint8)

    # Convert to PyTorch Tensor: shape (1, 3, 224, 224), scaled to [0.0, 1.0]
    np_norm = np_rgb.astype(np.float32) / 255.0
    tensor = torch.from_numpy(np_norm).permute(2, 0, 1).unsqueeze(0)  # (1, 3, 224, 224)

    return tensor, np_rgb


@predict_bp.route("/health", methods=["GET"])
def health_check():
    """Health status and configuration inspection."""
    device = get_device()
    supabase = get_supabase_service()

    return jsonify({
        "status": "healthy",
        "service": "QORA Clinical Decision Support Engine",
        "version": "1.0.0",
        "device": str(device),
        "cuda_available": torch.cuda.is_available(),
        "quantum_simulator": {
            "backend": "default.qubit",
            "wires": 6,
            "measurement_bases": ["Pauli-Z", "Pauli-X", "Pauli-Y"],
            "output_features": 18
        },
        "supported_backbones": list(SUPPORTED_BACKBONES.keys()),
        "supabase_connected": supabase.is_cloud_connected,
        "gemini_active": bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here")
    })


@predict_bp.route("/models", methods=["GET"])
def list_models():
    """Returns available backbones with architectural details."""
    return jsonify({
        "backbones": SUPPORTED_BACKBONES,
        "default_backbone": "resnet50",
        "default_threshold": 0.50,
        "quantum_specs": {
            "qubits": 6,
            "variational_layers": 3,
            "entanglement": "Ring CNOT",
            "state_preparation": "RY Angle Embedding in [0, pi]"
        }
    })


@predict_bp.route("/predict", methods=["POST"])
def analyze_radiograph():
    """
    Main prediction endpoint.
    Processes CXR image, runs HQCNN inference, generates Grad-CAM heatmap,
    synthesizes Gemini report, and saves to database.
    """
    # 1. Parse Image input
    raw_file = None
    if "file" in request.files:
        raw_file = request.files["file"]
    elif request.is_json and "image_data" in request.json:
        # Base64 data URI format
        b64_str = request.json["image_data"]
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
        raw_file = base64.b64decode(b64_str)

    if raw_file is None:
        return jsonify({"error": "No image provided. Please upload a file or base64 image data."}), 400

    # 2. Parse form options
    form_data = request.form if request.form else (request.json or {})
    backbone_name = form_data.get("backbone", "resnet50")
    try:
        threshold = float(form_data.get("threshold", 0.50))
    except (ValueError, TypeError):
        threshold = 0.50

    patient_tag = form_data.get("patient_tag", "PT-ANON")
    doctor_notes = form_data.get("doctor_notes", "")
    colormap_name = form_data.get("colormap", "jet")

    try:
        # 3. Preprocess Image
        tensor, original_rgb_np = preprocess_image_file(raw_file)
        device = get_device()
        tensor = tensor.to(device)

        # 4. Load Model & Run Inference
        model = get_cached_model(backbone_name=backbone_name, threshold=threshold)
        prediction_metrics = model.predict_sample(tensor, custom_threshold=threshold)

        # 5. Compute Grad-CAM Overlay & Anatomical Analysis
        gradcam_results = generate_gradcam_overlay(
            model=model,
            input_tensor=tensor,
            original_rgb_np=original_rgb_np,
            colormap_name=colormap_name
        )

        # 6. Generate Gemini Clinical Decision Report
        clinical_report = generate_clinical_report(
            prediction_result=prediction_metrics,
            top_activated_zones=gradcam_results["top_activated_zones"],
            doctor_notes=doctor_notes
        )

        # 7. Construct Full Response Payload
        response_data = {
            "patient_tag": patient_tag,
            "prediction": prediction_metrics["prediction"],
            "label_code": prediction_metrics["label_code"],
            "tb_probability": prediction_metrics["tb_probability"],
            "confidence_score": prediction_metrics["confidence_score"],
            "logit": prediction_metrics["logit"],
            "threshold_applied": threshold,
            "backbone_name": backbone_name,
            "quantum_circuit": prediction_metrics["quantum_circuit"],
            "anatomical_zones": gradcam_results["anatomical_zones"],
            "top_activated_zones": gradcam_results["top_activated_zones"],
            "visualizations": {
                "original_uri": gradcam_results["original_data_uri"],
                "heatmap_uri": gradcam_results["heatmap_data_uri"],
                "overlay_uri": gradcam_results["overlay_data_uri"],
            },
            "clinical_report": clinical_report,
            "doctor_notes": doctor_notes
        }

        # 8. Save Record to Supabase / Local Store
        supabase = get_supabase_service()
        saved_record = supabase.save_analysis({
            "patient_tag": patient_tag,
            "backbone": backbone_name,
            "prediction": prediction_metrics["prediction"],
            "probability": prediction_metrics["tb_probability"],
            "confidence": prediction_metrics["confidence_score"],
            "threshold": threshold,
            "anatomical_zones": gradcam_results["anatomical_zones"],
            "quantum_summary": prediction_metrics["quantum_circuit"]["measurements"],
            "clinical_report": clinical_report,
            "original_image_uri": gradcam_results["original_data_uri"],
            "overlay_image_uri": gradcam_results["overlay_data_uri"],
            "doctor_notes": doctor_notes
        })
        response_data["record_id"] = saved_record.get("id")

        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


@predict_bp.route("/history", methods=["GET"])
def get_history():
    """Fetches diagnosis history."""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        supabase = get_supabase_service()
        history = supabase.fetch_history(limit=limit, offset=offset)
        return jsonify({"history": history, "count": len(history)}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch history: {str(e)}"}), 500


@predict_bp.route("/report/regenerate", methods=["POST"])
def regenerate_report():
    """Regenerates Gemini report with updated clinical notes or prompt context."""
    if not request.is_json:
        return jsonify({"error": "JSON payload required"}), 400

    data = request.json
    prediction_result = data.get("prediction_result", {})
    top_activated_zones = data.get("top_activated_zones", [])
    doctor_notes = data.get("doctor_notes", "")

    try:
        report = generate_clinical_report(
            prediction_result=prediction_result,
            top_activated_zones=top_activated_zones,
            doctor_notes=doctor_notes
        )
        return jsonify({"clinical_report": report}), 200
    except Exception as e:
        return jsonify({"error": f"Report regeneration failed: {str(e)}"}), 500


@predict_bp.route("/samples", methods=["GET"])
def get_sample_presets():
    """Generates synthetic CXR sample presets for fast interactive demonstration."""
    try:
        samples = []
        presets = [
            {
                "id": "sample-normal-1",
                "name": "Normal CXR (Clear Lung Fields)",
                "category": "Normal",
                "pattern": "normal",
                "description": "Bilateral clear lung fields with sharp costophrenic angles and normal mediastinal contour."
            },
            {
                "id": "sample-apical-tb",
                "name": "Active TB (Right Apical Infiltrate)",
                "category": "TB Positive",
                "pattern": "apical_tb",
                "description": "Focal patchy opacity with ill-defined margins in the Right Upper Lobe / Apical segment."
            },
            {
                "id": "sample-cavitary-tb",
                "name": "Advanced TB (Left Cavitary Lesion)",
                "category": "TB Positive",
                "pattern": "cavitary_tb",
                "description": "Thick-walled cavitary lucency in Left Upper Lobe with surrounding consolidation."
            }
        ]

        for p in presets:
            _, data_uri = generate_synthetic_cxr(p["pattern"])
            samples.append({
                **p,
                "image_data_uri": data_uri
            })

        return jsonify({"samples": samples}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate sample presets: {str(e)}"}), 500

