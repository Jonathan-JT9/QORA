"""
Gemini Clinical Decision Support Service for QORA
Integrates with Google Gemini (2.5 Flash / 1.5 Flash) to synthesize
radiological findings, Grad-CAM anatomical attributions, and quantum metrics
into structured medical decision support reports.
"""

import os
import warnings
from typing import Any, Dict, List, Optional

# Suppress harmless SDK deprecation notices
warnings.filterwarnings("ignore", category=FutureWarning)

try:
    import google.generativeai as genai
    HAS_GEMINI_SDK = True
except ImportError:
    HAS_GEMINI_SDK = False


SYSTEM_CLINICAL_PROMPT = """
You are an expert Thoracic Radiologist and Clinical AI Consultant reviewing findings produced by "QORA" (Quantum-Optimized Radiograph Analysis), a Hybrid Quantum-Classical Convolutional Neural Network (HQCNN) designed for binary Pulmonary Tuberculosis (TB) screening on Chest X-Rays (CXRs).

Your task is to generate a rigorous, objective, and structured Clinical Decision Support Report.

Follow this standard clinical reporting format:
# QORA CLINICAL DECISION SUPPORT REPORT

## 1. STUDY & INFERENCE SUMMARY
- **Primary AI Assessment**: [TB Positive / Normal - Non-TB]
- **Posterior Probability**: [P(TB)]
- **Model Confidence**: [Confidence %]
- **Feature Extractor Backbone**: [Backbone Name]
- **Quantum Layer Encoding**: 6-Qubit VQC with 18-dim Multi-Basis Pauli (Z, X, Y) Readout

## 2. RADIOLOGICAL FINDINGS & ANATOMICAL LOCALIZATION
- Correlate the top Grad-CAM activated anatomical lung zones with classic radiologic presentations of Tuberculosis (e.g., apical-posterior infiltrates, nodular consolidation, cavitary lucencies, pleural thickening, Ghon focus / lymphadenopathy).
- Highlight any region exhibiting heightened activation.

## 3. QUANTUM FEATURE ATTRIBUTION CONTEXT
- Provide a brief interpretative note on the quantum feature representation (high dimensional Hilbert space projection capturing subtle non-local textural correlations across lung fields).

## 4. CLINICAL RECOMMENDATIONS & NEXT STEPS
- Explicitly list confirmatory diagnostic tests according to WHO TB guidelines:
  1. Molecular Diagnostics: Sputum GeneXpert MTB/RIF Ultra
  2. Direct Microscopy: Acid-Fast Bacilli (AFB) Ziehl-Neelsen or Auramine stain
  3. High-Resolution Chest CT (if cavitary disease or vascular erosion is suspected)
  4. Mycobacterial Sputum Culture & Drug Susceptibility Testing (DST)

## 5. REGULATORY & CLINICAL DISCLAIMER
- State clearly: "QORA is an investigational Clinical Decision Support Tool intended to augment radiologist review. It is NOT a standalone diagnostic device. Clinical correlation and confirmatory laboratory assays are mandatory."
"""


class GeminiClinicalService:
    """Service to generate radiologist decision support notes via Gemini."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = None

        if HAS_GEMINI_SDK and self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=SYSTEM_CLINICAL_PROMPT
                )
            except Exception:
                self.client = None

    def generate_report(
        self,
        prediction_result: Dict[str, Any],
        top_activated_zones: List[Dict[str, Any]],
        doctor_notes: Optional[str] = None
    ) -> str:
        """
        Synthesizes model predictions and Grad-CAM activations into a clinical note.

        Args:
            prediction_result: Dict returned by HQCNNModel.predict_sample
            top_activated_zones: List of activated anatomical lung zones
            doctor_notes: Optional notes input by the clinician

        Returns:
            Formatted Markdown clinical note.
        """
        # If Gemini client is active, prompt the live model
        if self.client is not None:
            try:
                prompt_content = self._build_prompt_payload(
                    prediction_result, top_activated_zones, doctor_notes
                )
                response = self.client.generate_content(prompt_content)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                # Log and fallback to deterministic synthetic template
                print(f"[GeminiService] API generation failed, using clinical fallback template: {e}")

        return self._generate_fallback_template(prediction_result, top_activated_zones, doctor_notes)

    def _build_prompt_payload(
        self,
        prediction_result: Dict[str, Any],
        top_activated_zones: List[Dict[str, Any]],
        doctor_notes: Optional[str]
    ) -> str:
        zones_desc = "\n".join([
            f"- {z['name']}: Peak Activation {z['peak_activation']}, Mean {z['mean_activation']} ({z['clinical_significance']})"
            for z in top_activated_zones
        ]) if top_activated_zones else "No distinct focal hyper-activation identified (diffuse baseline)."

        q_info = prediction_result.get("quantum_circuit", {})
        qubit_states = q_info.get("qubit_states", [])
        q_summary = ", ".join([
            f"Q{q['qubit_index']} (<Z>={q['expval_z']}, <X>={q['expval_x']}, <Y>={q['expval_y']})"
            for q in qubit_states[:4]
        ])

        payload = f"""
Input Scan Case Data:
- Model Classification: {prediction_result.get('prediction')}
- Estimated P(TB): {prediction_result.get('tb_probability')}
- Model Confidence Score: {prediction_result.get('confidence_score')}%
- Decision Threshold Applied: {prediction_result.get('threshold_applied')}
- CNN Backbone: {prediction_result.get('backbone_name')}
- Key Quantum State Readings: {q_summary}

Grad-CAM Salient Anatomical Regions:
{zones_desc}

Clinician / Operator Notes:
{doctor_notes if doctor_notes else "None provided."}

Please synthesize the structured Clinical Decision Support Report for this patient case.
"""
        return payload

    def _generate_fallback_template(
        self,
        prediction_result: Dict[str, Any],
        top_activated_zones: List[Dict[str, Any]],
        doctor_notes: Optional[str]
    ) -> str:
        is_positive = prediction_result.get("label_code", 0) == 1
        prediction = prediction_result.get("prediction", "Unknown")
        prob = prediction_result.get("tb_probability", 0.5)
        conf = prediction_result.get("confidence_score", 50.0)
        backbone = prediction_result.get("backbone_name", "ResNet-50")

        zones_text = ""
        if top_activated_zones:
            for z in top_activated_zones:
                zones_text += f"- **{z['name']}**: Elevated neural activation detected (Peak: `{z['peak_activation']}`, Mean: `{z['mean_activation']}`). *{z['clinical_significance']}*\n"
        else:
            zones_text = "- **Bilateral Lung Fields**: Symmetric radiodensity across apical, mid, and basal lung zones without focal circumscribed hyper-activation.\n"

        if is_positive:
            impression = f"**HIGH RISK OF ACTIVE PULMONARY TUBERCULOSIS (Probability: {prob*100:.1f}%)**\n\nThe hybrid quantum-classical feature extractor detected focal radiographic features consistent with mycobacterial infiltration."
            rec_action = """1. **Confirmatory Molecular Assay**: Immediate Sputum GeneXpert MTB/RIF Ultra to confirm *M. tuberculosis* DNA and rifampicin resistance.
2. **Microscopy**: Direct AFB smear (Ziehl-Neelsen staining) on two consecutive sputum specimens.
3. **Thoracic Imaging**: Non-contrast High-Resolution CT (HRCT) of the chest to characterize tree-in-bud nodularity and occult cavitation.
4. **Infection Control**: Initiate airborne isolation precautions pending microbiological confirmation."""
        else:
            impression = f"**LOW RISK OF PULMONARY TUBERCULOSIS (Confidence: {conf:.1f}%)**\n\nNo distinctive focal radiographic hallmarks of active tuberculous consolidation or cavitation were recognized at the selected sensitivity threshold."
            rec_action = """1. **Routine Monitoring**: If clinical suspicion persists (persistent cough > 2 weeks, hemoptysis, night sweats), perform sputum GeneXpert MTB/RIF.
2. **Differential Investigation**: Evaluate for alternative etiologies including bacterial pneumonia, viral bronchitis, or fungal infection.
3. **Follow-up Radiography**: Interval repeat chest radiography in 4-6 weeks if respiratory symptoms fail to resolve."""

        report = f"""# QORA CLINICAL DECISION SUPPORT REPORT

## 1. STUDY & INFERENCE SUMMARY
- **Primary AI Assessment**: `{prediction}`
- **Posterior TB Probability**: `{prob:.4f}` ({prob*100:.1f}%)
- **Model Confidence**: `{conf:.2f}%`
- **Feature Extractor Backbone**: `{backbone.upper()}`
- **Quantum Circuit Layer**: 6-Qubit VQC with 18-dim Multi-Basis Expectation Readout ($\langle Z \\rangle, \langle X \\rangle, \langle Y \\rangle$)

## 2. RADIOLOGICAL FINDINGS & ANATOMICAL LOCALIZATION
{zones_text}
{f"**Attending Physician Notes:** {doctor_notes}" if doctor_notes else ""}

## 3. QUANTUM FEATURE ATTRIBUTION CONTEXT
- The 6-qubit quantum variational layer mapped compressed radiograph latent embeddings into an 18-dimensional Multi-Basis Pauli space.
- Entangled state dynamics captured non-local spatial dependencies between apical and hilar regions, enhancing discriminative sensitivity.

## 4. CLINICAL RECOMMENDATIONS & NEXT STEPS
{rec_action}

---
> [!IMPORTANT]
> **REGULATORY & CLINICAL DISCLAIMER:** QORA is an algorithmic Decision Support System engineered to assist trained medical practitioners. It is **NOT** a standalone medical diagnostic device. Final therapeutic decisions must be based on comprehensive clinical evaluation and certified microbiological/molecular assays.
"""
        return report


def generate_clinical_report(
    prediction_result: Dict[str, Any],
    top_activated_zones: List[Dict[str, Any]],
    doctor_notes: Optional[str] = None
) -> str:
    """Convenience helper function to generate a report."""
    service = GeminiClinicalService()
    return service.generate_report(prediction_result, top_activated_zones, doctor_notes)
