"""
QORA Services Package
Explainability (Grad-CAM), Gemini Clinical Synthesis, and Supabase Persistence
"""
from .gradcam import GradCAMService, generate_gradcam_overlay
from .gemini import GeminiClinicalService, generate_clinical_report
from .supabase_client import SupabaseService, get_supabase_service

__all__ = [
    "GradCAMService",
    "generate_gradcam_overlay",
    "GeminiClinicalService",
    "generate_clinical_report",
    "SupabaseService",
    "get_supabase_service",
]
