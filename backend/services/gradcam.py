"""
Grad-CAM Explainability Service for QORA
Extracts target layer activations and gradients from HQCNN, calculates visual heatmaps,
and maps activations to anatomical lung zones for clinical interpretation.
"""

import base64
import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from models.hqcnn_model import HQCNNModel


ANATOMICAL_ZONES = {
    "right_upper_apical": {
        "name": "Right Upper Lobe / Apical Zone",
        "roi": (0.10, 0.48, 0.05, 0.38),  # (x_min, x_max, y_min, y_max) relative to [0, 1]
        "clinical_significance": "Classic primary & post-primary reactivation TB site (apicoposterior segments)."
    },
    "left_upper_apical": {
        "name": "Left Upper Lobe / Apical Zone",
        "roi": (0.52, 0.90, 0.05, 0.38),
        "clinical_significance": "Frequent site for cavitary TB, fibrocalcific scars, and nodular infiltration."
    },
    "right_mid_zone": {
        "name": "Right Mid Lung Zone",
        "roi": (0.10, 0.48, 0.38, 0.68),
        "clinical_significance": "Site of Ghon focus and paratracheal/hilar lymphadenopathy."
    },
    "left_mid_zone": {
        "name": "Left Mid Lung Zone",
        "roi": (0.52, 0.90, 0.38, 0.68),
        "clinical_significance": "Hilar enlargement and peribronchial thickening."
    },
    "right_lower_base": {
        "name": "Right Lower Lobe / Costophrenic Base",
        "roi": (0.10, 0.48, 0.68, 0.95),
        "clinical_significance": "Evaluated for tuberculous pleural effusion, blunting, and basal consolidations."
    },
    "left_lower_base": {
        "name": "Left Lower Lobe / Costophrenic Base",
        "roi": (0.52, 0.90, 0.68, 0.95),
        "clinical_significance": "Costophrenic sulcus blunting and retrocardiac infiltrates."
    }
}


class GradCAMService:
    """
    Computes Gradient-weighted Class Activation Mapping (Grad-CAM)
    on the final convolutional layer of HQCNN.
    """

    def __init__(self, model: HQCNNModel):
        self.model = model
        self.target_layer = model.backbone.get_gradcam_target_layer()
        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None
        self._hooks: List = []
        self._register_hooks()

    def _register_hooks(self) -> None:
        """Attaches forward and backward hooks to capture intermediate conv tensors."""
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        h1 = self.target_layer.register_forward_hook(forward_hook)
        h2 = self.target_layer.register_full_backward_hook(backward_hook)
        self._hooks = [h1, h2]

    def remove_hooks(self) -> None:
        """Cleans up hooks."""
        for h in self._hooks:
            h.remove()
        self._hooks.clear()

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        target_class: Optional[int] = None
    ) -> np.ndarray:
        """
        Generates 2D normalized Grad-CAM activation heatmap of shape (224, 224).

        Args:
            input_tensor: Tensor of shape (1, 3, 224, 224)
            target_class: Target class index (defaults to the positive TB logit)

        Returns:
            2D numpy array of shape (224, 224) with values in range [0, 1].
        """
        self.model.eval()
        self.model.zero_grad()

        # Enable grad temporarily for backward hook
        with torch.enable_grad():
            x = input_tensor.clone().requires_grad_(True)
            logits = self.model(x)  # Shape (1, 1)

            # Target score is the binary classification logit
            score = logits[0, 0]
            score.backward(retain_graph=False)

        if self.activations is None or self.gradients is None:
            # Fallback uniform circular focus
            return np.ones((224, 224), dtype=np.float32) * 0.5

        # Global average pooling of gradients: weights alpha_k = (1/Z) * sum(grad)
        # activations: (1, C, H, W), gradients: (1, C, H, W)
        grads = self.gradients[0]  # (C, H, W)
        acts = self.activations[0]  # (C, H, W)

        weights = torch.mean(grads, dim=(1, 2), keepdim=True)  # (C, 1, 1)
        cam = torch.sum(weights * acts, dim=0)  # (H, W)

        # Apply ReLU to retain only positive contributory features
        cam = F.relu(cam).cpu().numpy()

        # Handle degenerate zero-grad maps
        if np.max(cam) - np.min(cam) > 1e-7:
            cam = (cam - np.min(cam)) / (np.max(cam) - np.min(cam))
        else:
            cam = np.zeros_like(cam)

        # Resize to input resolution (224, 224)
        cam_resized = cv2.resize(cam, (224, 224), interpolation=cv2.INTER_CUBIC)
        cam_resized = np.clip(cam_resized, 0.0, 1.0)

        return cam_resized.astype(np.float32)

    def analyze_anatomical_zones(self, heatmap: np.ndarray) -> List[Dict[str, Any]]:
        """
        Calculates localized activation intensity across anatomical lung quadrants.

        Args:
            heatmap: 2D array of shape (224, 224) with values in [0, 1].

        Returns:
            List of detected anatomical regions ranked by mean activation intensity.
        """
        h, w = heatmap.shape
        zone_results = []

        for zone_id, info in ANATOMICAL_ZONES.items():
            x_min_r, x_max_r, y_min_r, y_max_r = info["roi"]
            x1, x2 = int(x_min_r * w), int(x_max_r * w)
            y1, y2 = int(y_min_r * h), int(y_max_r * h)

            roi_patch = heatmap[y1:y2, x1:x2]
            if roi_patch.size == 0:
                continue

            mean_act = float(np.mean(roi_patch))
            max_act = float(np.max(roi_patch))
            p90_act = float(np.percentile(roi_patch, 90))

            zone_results.append({
                "zone_id": zone_id,
                "name": info["name"],
                "mean_activation": round(mean_act, 4),
                "peak_activation": round(max_act, 4),
                "p90_activation": round(p90_act, 4),
                "clinical_significance": info["clinical_significance"],
                "is_significantly_activated": mean_act > 0.35 or max_act > 0.65
            })

        # Rank descending by mean activation
        zone_results.sort(key=lambda z: z["mean_activation"], reverse=True)
        return zone_results


def create_colored_overlay(
    original_img_np: np.ndarray,
    heatmap: np.ndarray,
    colormap: int = cv2.COLORMAP_JET,
    alpha: float = 0.55
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Renders RGB colormap heatmap and alpha-blends it over the original radiograph.

    Args:
        original_img_np: RGB array of shape (224, 224, 3) in range [0, 255]
        heatmap: 2D array of shape (224, 224) in range [0, 1]
        colormap: OpenCV colormap constant (COLORMAP_JET, COLORMAP_VIRIDIS, etc.)
        alpha: Blend weight for heatmap overlay

    Returns:
        Tuple of (heatmap_rgb, blended_overlay_rgb) as uint8 arrays.
    """
    # Scale heatmap to uint8
    heatmap_uint8 = np.uint8(255 * heatmap)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, colormap)
    colored_heatmap_rgb = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    # Blend
    blended = np.clip(
        (1.0 - alpha) * original_img_np.astype(np.float32) + alpha * colored_heatmap_rgb.astype(np.float32),
        0, 255
    ).astype(np.uint8)

    return colored_heatmap_rgb, blended


def numpy_to_base64_png(img_rgb: np.ndarray) -> str:
    """Converts RGB numpy image to base64 encoded PNG data URI."""
    pil_img = Image.fromarray(img_rgb)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG", optimize=True)
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


def generate_gradcam_overlay(
    model: HQCNNModel,
    input_tensor: torch.Tensor,
    original_rgb_np: np.ndarray,
    colormap_name: str = "jet"
) -> Dict[str, Any]:
    """
    Full pipeline to generate Grad-CAM visual outputs and anatomical region metrics.
    """
    service = GradCAMService(model)
    try:
        heatmap = service.generate_heatmap(input_tensor)
        zone_analysis = service.analyze_anatomical_zones(heatmap)

        colormap = cv2.COLORMAP_JET
        if colormap_name.lower() == "viridis":
            colormap = cv2.COLORMAP_VIRIDIS
        elif colormap_name.lower() == "magma":
            colormap = cv2.COLORMAP_MAGMA
        elif colormap_name.lower() == "inferno":
            colormap = cv2.COLORMAP_INFERNO

        heatmap_rgb, blended_rgb = create_colored_overlay(
            original_rgb_np, heatmap, colormap=colormap, alpha=0.52
        )

        return {
            "heatmap_raw": heatmap.tolist(),
            "heatmap_data_uri": numpy_to_base64_png(heatmap_rgb),
            "overlay_data_uri": numpy_to_base64_png(blended_rgb),
            "original_data_uri": numpy_to_base64_png(original_rgb_np),
            "anatomical_zones": zone_analysis,
            "top_activated_zones": [z for z in zone_analysis if z["is_significantly_activated"]][:3]
        }
    finally:
        service.remove_hooks()
