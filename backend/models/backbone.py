"""
Backbone Feature Extractor Module for QORA
Supports ResNet50, ConvNeXt-Small, and EfficientNet-B4 with:
- Target convolutional layer extraction for Grad-CAM explainability
- Dimensionality reduction (Global Pooling -> 6 features)
- Angle scaling to [0, pi] for quantum RY state preparation
"""

import math
from typing import Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torchvision.models as models

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False


SUPPORTED_BACKBONES = {
    "resnet50": {
        "name": "ResNet-50",
        "feature_dim": 2048,
        "gradcam_layer": "layer4",
        "description": "Deep Residual Network with 50 layers, optimal for feature stability in radiograph opacities."
    },
    "convnext_small": {
        "name": "ConvNeXt-Small",
        "feature_dim": 768,
        "gradcam_layer": "stages.3",
        "description": "Modern pure-convolutional network with large receptive field for broad lung field context."
    },
    "efficientnet_b4": {
        "name": "EfficientNet-B4",
        "feature_dim": 1792,
        "gradcam_layer": "features.7",
        "description": "Compound-scaled architecture balancing resolution and fine cavitary lesion detection."
    }
}


def get_supported_backbones() -> Dict[str, dict]:
    """Returns metadata of all supported backbones."""
    return SUPPORTED_BACKBONES


class AngleScaler(nn.Module):
    """
    Scales classical real-valued representations into the bounded angular domain [0, pi]
    suitable for quantum RY rotational state preparation without clipping distortion.
    Formula: theta = pi * sigmoid(x)
    """

    def __init__(self):
        super().__init__()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return math.pi * self.sigmoid(x)


class CXRBackboneExtractor(nn.Module):
    """
    Modular CNN Backbone Extractor with:
    1. Truncated feature extraction exposing the final convolutional block.
    2. Adaptive Global Pooling.
    3. Projection layer down to 6 latent features.
    4. Angle scaling to [0, pi].
    """

    def __init__(
        self,
        backbone_name: str = "resnet50",
        pretrained: bool = True,
        latent_quantum_dim: int = 6
    ):
        super().__init__()
        if backbone_name not in SUPPORTED_BACKBONES:
            raise ValueError(
                f"Unsupported backbone '{backbone_name}'. Choose from: {list(SUPPORTED_BACKBONES.keys())}"
            )

        self.backbone_name = backbone_name
        self.latent_quantum_dim = latent_quantum_dim
        self.meta = SUPPORTED_BACKBONES[backbone_name]

        self._build_backbone(pretrained)

        # Dimensionality reduction head: Feature dim -> 6 features
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.projector = nn.Sequential(
            nn.Linear(self.feature_dim, 128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, self.latent_quantum_dim)
        )
        self.angle_scaler = AngleScaler()

        # Placeholders for Grad-CAM activations & gradients
        self.target_activations: Optional[torch.Tensor] = None
        self.target_gradients: Optional[torch.Tensor] = None
        self._hook_handles: List = []

    def _build_backbone(self, pretrained: bool) -> None:
        """Constructs the underlying CNN architecture and locates the target conv layer."""
        if self.backbone_name == "resnet50":
            weights = models.ResNet50_Weights.DEFAULT if pretrained else None
            base = models.resnet50(weights=weights)
            
            # Conv layers up to layer4
            self.stem = nn.Sequential(
                base.conv1,
                base.bn1,
                base.relu,
                base.maxpool,
                base.layer1,
                base.layer2,
                base.layer3,
            )
            self.target_layer = base.layer4  # Shape: (B, 2048, 7, 7) for 224x224 input
            self.feature_dim = 2048

        elif self.backbone_name == "convnext_small":
            try:
                weights = models.ConvNeXt_Small_Weights.DEFAULT if pretrained else None
                base = models.convnext_small(weights=weights)
                self.stem = base.features[:-1]
                self.target_layer = base.features[-1]  # Last stage
                self.feature_dim = 768
            except Exception:
                # Fallback if torchvision convnext is structured differently
                weights = models.ResNet50_Weights.DEFAULT if pretrained else None
                base = models.resnet50(weights=weights)
                self.stem = nn.Sequential(
                    base.conv1, base.bn1, base.relu, base.maxpool,
                    base.layer1, base.layer2, base.layer3
                )
                self.target_layer = base.layer4
                self.feature_dim = 2048

        elif self.backbone_name == "efficientnet_b4":
            try:
                weights = models.EfficientNet_B4_Weights.DEFAULT if pretrained else None
                base = models.efficientnet_b4(weights=weights)
                self.stem = base.features[:-2]
                self.target_layer = base.features[-2:]
                self.feature_dim = 1792
            except Exception:
                weights = models.ResNet50_Weights.DEFAULT if pretrained else None
                base = models.resnet50(weights=weights)
                self.stem = nn.Sequential(
                    base.conv1, base.bn1, base.relu, base.maxpool,
                    base.layer1, base.layer2, base.layer3
                )
                self.target_layer = base.layer4
                self.feature_dim = 2048

    def get_gradcam_target_layer(self) -> nn.Module:
        """Returns reference to the final convolutional layer for Grad-CAM hooks."""
        return self.target_layer

    def extract_features(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Extracts spatial feature maps and pooled feature vector.

        Args:
            x: Input CXR image tensor of shape (batch_size, 3, 224, 224)

        Returns:
            Tuple of:
            - feature_maps: Tensor of shape (batch_size, feature_dim, H_feat, W_feat)
            - pooled_features: Tensor of shape (batch_size, feature_dim)
        """
        h = self.stem(x)
        feature_maps = self.target_layer(h)
        
        pooled = self.global_pool(feature_maps)
        pooled = torch.flatten(pooled, 1)
        return feature_maps, pooled

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass converting raw radiograph pixels into 6 quantum angle parameters in [0, pi].

        Args:
            x: Tensor of shape (batch_size, 3, 224, 224)

        Returns:
            Tuple of:
            - angles: Tensor of shape (batch_size, 6) in range [0, pi]
            - feature_maps: Spatial feature maps for Grad-CAM
        """
        feature_maps, pooled = self.extract_features(x)
        latent_features = self.projector(pooled)
        angles = self.angle_scaler(latent_features)
        return angles, feature_maps
