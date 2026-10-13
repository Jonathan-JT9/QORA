"""
Sample CXR Generator Utility
Generates realistic synthetic radiograph patterns for immediate clinical demonstration:
1. Normal Healthy CXR (clear lung fields, clear costophrenic angles)
2. Apical Infiltrate TB (opacities in right upper lobe)
3. Cavitary Lesion TB (thick-walled lucent ring in left upper lobe)
"""

import base64
import io
import math
from typing import Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def generate_synthetic_cxr(pattern_type: str = "normal") -> Tuple[Image.Image, str]:
    """
    Synthesizes a realistic 224x224 grayscale Chest X-Ray radiograph.

    Args:
        pattern_type: 'normal', 'apical_tb', 'cavitary_tb'

    Returns:
        Tuple of (PIL.Image, base64_data_uri)
    """
    w, h = 224, 224
    img = np.zeros((h, w), dtype=np.float32)

    # 1. Base anatomical ribcage and mediastinum gradient
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    cx, cy = w / 2.0, h / 2.0

    # Thoracic silhouette
    thoracic_oval = ((x_coords - cx) / (w * 0.44)) ** 2 + ((y_coords - cy) / (h * 0.46)) ** 2
    body_mask = thoracic_oval < 1.0
    img[body_mask] = 120.0 - thoracic_oval[body_mask] * 40.0

    # 2. Lung fields (radiolucent / darker regions)
    # Right Lung (viewer's left)
    r_lung = ((x_coords - (w * 0.32)) / (w * 0.18)) ** 2 + ((y_coords - (h * 0.52)) / (h * 0.36)) ** 2
    r_mask = r_lung < 1.0
    img[r_mask] = 35.0 + r_lung[r_mask] * 30.0

    # Left Lung (viewer's right, adjusted for cardiac notch)
    l_lung = ((x_coords - (w * 0.68)) / (w * 0.17)) ** 2 + ((y_coords - (h * 0.50)) / (h * 0.34)) ** 2
    l_mask = l_lung < 1.0
    img[l_mask] = 35.0 + l_lung[l_mask] * 30.0

    # 3. Mediastinum & Cardiac Silhouette (radiopaque / brighter white)
    cardiac_oval = ((x_coords - (w * 0.54)) / (w * 0.14)) ** 2 + ((y_coords - (h * 0.62)) / (h * 0.20)) ** 2
    c_mask = cardiac_oval < 1.0
    img[c_mask] = np.maximum(img[c_mask], 160.0 - cardiac_oval[c_mask] * 60.0)

    # Spine column
    spine_mask = np.abs(x_coords - cx) < 12.0
    img[spine_mask] = np.maximum(img[spine_mask], 140.0)

    # Clavicles
    r_clav = np.abs((y_coords - 45) - 0.15 * (x_coords - cx)) < 4.0
    l_clav = np.abs((y_coords - 45) + 0.15 * (x_coords - cx)) < 4.0
    img[r_clav & body_mask] = 180.0
    img[l_clav & body_mask] = 180.0

    # Rib shadows
    for rib_y in range(60, 190, 22):
        rib_curve = np.abs(y_coords - (rib_y + 0.002 * (x_coords - cx) ** 2)) < 3.5
        img[rib_curve & (r_mask | l_mask)] += 25.0

    # 4. Inject specific pathological features
    if pattern_type == "apical_tb":
        # Dense patchy opacity in Right Upper Lobe / Apical region
        r_apex_dist = np.sqrt((x_coords - 68) ** 2 + (y_coords - 58) ** 2)
        infiltrate = np.exp(- (r_apex_dist ** 2) / (2 * (16 ** 2))) * 140.0
        # Add granular noise
        noise = np.random.normal(0, 15, (h, w))
        img += (infiltrate + noise * (infiltrate > 20))

    elif pattern_type == "cavitary_tb":
        # Thick-walled cavitary lesion in Left Upper Lobe
        l_cav_dist = np.sqrt((x_coords - 156) ** 2 + (y_coords - 64) ** 2)
        # Ring wall (outer bright, center dark lucency)
        wall_outer = np.exp(- ((l_cav_dist - 14) ** 2) / (2 * (5 ** 2))) * 150.0
        center_lucency = (l_cav_dist < 10) * -60.0
        img += wall_outer + center_lucency

    # Add realistic radiographic anatomical texture noise
    texture_noise = np.random.normal(0, 4.0, (h, w))
    img = np.clip(img + texture_noise, 0, 255).astype(np.uint8)

    pil_img = Image.fromarray(img).convert("RGB")
    # Slight Gaussian blur to mimic analog film/digital plate dispersion
    pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=0.7))

    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"

    return pil_img, data_uri
